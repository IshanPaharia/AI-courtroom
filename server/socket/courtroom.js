import { db } from '../db/index.js';
import { cases, users, messages } from '../db/schema.js';
import { eq, and, asc } from 'drizzle-orm';
import { getJudgeInterjection } from '../services/judge.js';
import { verifyToken } from '@clerk/express';

// Per-room state (in-memory, resets on server restart)
const roomState = new Map();

function getRoom(caseId) {
  if (!roomState.has(caseId)) {
    roomState.set(caseId, {
      messagesSinceJudge: 0,
      judgeProcessing: false,
      timeouts: {},
      rateLimits: {},
      onlineUsers: new Set(),
      forceVerdictVotes: { plaintiff: false, defendant: false },
      objections: { plaintiff: 0, defendant: 0 },
    });
  }
  return roomState.get(caseId);
}

function isTimedOut(room, oduserId) {
  const expires = room.timeouts[oduserId];
  if (!expires) return false;
  if (Date.now() > expires) {
    delete room.timeouts[oduserId];
    return false;
  }
  return true;
}

function checkRateLimit(room, oduserId) {
  const now = Date.now();
  const window = 30_000;
  const maxMessages = 5;

  if (!room.rateLimits[oduserId]) room.rateLimits[oduserId] = [];
  const timestamps = room.rateLimits[oduserId];

  // Remove old timestamps
  room.rateLimits[oduserId] = timestamps.filter((t) => now - t < window);

  if (room.rateLimits[oduserId].length >= maxMessages) return false;

  room.rateLimits[oduserId].push(now);
  return true;
}

async function loadCaseWithUsers(caseId) {
  const [caseData] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  if (!caseData) return null;

  const [plaintiff] = await db.select().from(users).where(eq(users.id, caseData.plaintiffId)).limit(1);
  let defendant = null;
  if (caseData.defendantId) {
    [defendant] = await db.select().from(users).where(eq(users.id, caseData.defendantId)).limit(1);
  }

  return {
    ...caseData,
    plaintiffName: plaintiff?.username || 'Plaintiff',
    defendantName: defendant?.username || 'Defendant',
    plaintiff,
    defendant,
  };
}

async function loadMessages(caseId) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.caseId, caseId))
    .orderBy(asc(messages.createdAt));
}

async function recalcWinLoss(userId) {
  const { sql } = await import('drizzle-orm');
  const { or } = await import('drizzle-orm');

  const [winCount] = await db
    .select({ count: sql`count(*)::int` })
    .from(cases)
    .where(and(
      eq(cases.status, 'verdict_delivered'),
      or(
        and(eq(cases.plaintiffId, userId), eq(cases.verdictWinner, 'plaintiff_wins')),
        and(eq(cases.defendantId, userId), eq(cases.verdictWinner, 'defendant_wins'))
      )
    ));

  const [lossCount] = await db
    .select({ count: sql`count(*)::int` })
    .from(cases)
    .where(and(
      eq(cases.status, 'verdict_delivered'),
      or(
        and(eq(cases.plaintiffId, userId), eq(cases.verdictWinner, 'defendant_wins')),
        and(eq(cases.defendantId, userId), eq(cases.verdictWinner, 'plaintiff_wins'))
      )
    ));

  await db
    .update(users)
    .set({ wins: winCount?.count || 0, losses: lossCount?.count || 0 })
    .where(eq(users.id, userId));
}

async function triggerJudge(io, caseId) {
  const room = getRoom(caseId);
  if (room.judgeProcessing) return;
  room.judgeProcessing = true;

  const forceVerdict = room.messagesSinceJudge >= 999;

  try {
    io.to(caseId).emit('judge-typing', true);

    const caseData = await loadCaseWithUsers(caseId);
    if (!caseData || caseData.status === 'verdict_delivered') return;

    const chatMessages = await loadMessages(caseId);

    const result = await getJudgeInterjection({
      caseData,
      forceVerdict,
      chatMessages,
      persona: caseData.judgePersona,
    });

    if (result.type === 'silent') {
      io.to(caseId).emit('judge-typing', false);
      room.messagesSinceJudge = 0;
      return;
    }

    const metadata = {};
    if (result.type === 'timeout') {
      metadata.target = result.target;
      metadata.duration = result.duration || 60;
    }
    if (result.type === 'verdict') {
      metadata.verdict = result.verdict;
      metadata.reasoning = result.reasoning;
      metadata.compensation = result.compensation;
      metadata.drama_score = result.drama_score;
      metadata.notable_quote = result.notable_quote;
    }
    if (result.type === 'warning') {
      metadata.target = result.target;
    }

    const [savedMsg] = await db.insert(messages).values({
      caseId,
      userId: null,
      sender: 'judge',
      type: result.type,
      content: result.content || result.reasoning || '',
      metadata: JSON.stringify(metadata),
    }).returning();

    io.to(caseId).emit('judge-typing', false);
    io.to(caseId).emit('new-message', savedMsg);

    // Handle timeout
    if (result.type === 'timeout' && result.target) {
      const targetUserId = result.target === 'plaintiff'
        ? caseData.plaintiffId
        : caseData.defendantId;
      const duration = (result.duration || 60) * 1000;
      room.timeouts[targetUserId] = Date.now() + duration;

      io.to(caseId).emit('user-timeout', {
        target: result.target,
        targetUserId,
        duration: result.duration || 60,
        reason: result.content,
      });
    }

    // Handle verdict
    if (result.type === 'verdict') {
      await db.update(cases).set({
        status: 'verdict_delivered',
        verdictText: result.reasoning,
        verdictWinner: result.verdict,
        finalCompensation: result.compensation,
        dramaScore: result.drama_score,
        notableQuote: result.notable_quote,
        resolvedAt: new Date(),
      }).where(eq(cases.id, caseId));

      await recalcWinLoss(caseData.plaintiffId);
      if (caseData.defendantId) await recalcWinLoss(caseData.defendantId);

      io.to(caseId).emit('verdict-delivered', {
        caseId,
        verdict: result.verdict,
        reasoning: result.reasoning,
        compensation: result.compensation,
        dramaScore: result.drama_score,
        notableQuote: result.notable_quote,
      });
    }

    room.messagesSinceJudge = 0;
  } catch (err) {
    console.error('Judge interjection error:', err);
    io.to(caseId).emit('judge-typing', false);
  } finally {
    room.judgeProcessing = false;
  }
}

export function setupCourtroomSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No auth token'));

      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      if (!payload?.sub) return next(new Error('Invalid token'));

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.clerkId, payload.sub))
        .limit(1);

      if (!user) return next(new Error('User not found'));
      socket.dbUser = user;
      next();
    } catch (err) {
      console.error('Socket auth error:', err.message);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.dbUser.username} (${socket.dbUser.id})`);

    socket.on('join-courtroom', async (caseId) => {
      try {
        const caseData = await loadCaseWithUsers(caseId);
        if (!caseData) {
          return socket.emit('error', { message: 'Case not found' });
        }

        const userId = socket.dbUser.id;
        const isPlaintiff = caseData.plaintiffId === userId;
        const isDefendant = caseData.defendantId === userId;
        const isSpectator = !isPlaintiff && !isDefendant;

        // Leave any previously joined room (handles reconnects / StrictMode)
        if (socket.caseId) {
          socket.leave(socket.caseId);
        }

        socket.join(caseId);
        socket.caseId = caseId;
        socket.side = isPlaintiff ? 'plaintiff' : isDefendant ? 'defendant' : 'spectator';

        const room = getRoom(caseId);
        if (!isSpectator) {
          room.onlineUsers.add(userId);
        }

        const existingMessages = await loadMessages(caseId);

        // Restore objection counts from DB
        const objectionMsgs = existingMessages.filter((m) => m.type === 'objection');
        room.objections.plaintiff = objectionMsgs.filter((m) => m.sender === 'plaintiff').length;
        room.objections.defendant = objectionMsgs.filter((m) => m.sender === 'defendant').length;

        socket.emit('case-data', {
          caseData: {
            id: caseData.id,
            title: caseData.title,
            description: caseData.description,
            requestedCompensation: caseData.requestedCompensation,
            judgePersona: caseData.judgePersona,
            status: caseData.status,
            plaintiff: caseData.plaintiff ? { id: caseData.plaintiff.id, username: caseData.plaintiff.username, avatarUrl: caseData.plaintiff.avatarUrl } : null,
            defendant: caseData.defendant ? { id: caseData.defendant.id, username: caseData.defendant.username, avatarUrl: caseData.defendant.avatarUrl } : null,
            isAppeal: caseData.isAppeal,
            appealedFromId: caseData.appealedFromId,
          },
          messages: existingMessages,
          yourSide: socket.side,
          objections: { ...room.objections },
        });

        io.to(caseId).emit('user-presence', {
          userId,
          username: socket.dbUser.username,
          side: socket.side,
          online: true,
          onlineUsers: Array.from(room.onlineUsers),
        });

        // Send an intro message from the judge if this is a fresh session
        if (
          caseData.status === 'in_session' &&
          existingMessages.length === 0
        ) {
          const introContent = `Court is now in session! The case "${caseData.title}" will be heard. ${caseData.plaintiffName}, please present your complaint. ${caseData.defendantName}, you will have your chance to respond. I will be monitoring and may interject at any time. Let's begin!`;
          const [intro] = await db.insert(messages).values({
            caseId,
            userId: null,
            sender: 'judge',
            type: 'comment',
            content: introContent,
            metadata: null,
          }).returning();
          io.to(caseId).emit('new-message', intro);
        }
      } catch (err) {
        console.error('Join courtroom error:', err);
        socket.emit('error', { message: 'Failed to join courtroom' });
      }
    });

    socket.on('send-message', async ({ content, attachmentUrl, attachmentType }) => {
      try {
        const caseId = socket.caseId;
        if (!caseId) return socket.emit('error', { message: 'Not in a courtroom' });
        if (socket.side === 'spectator') return socket.emit('error', { message: 'Spectators cannot send messages' });

        const caseData = await loadCaseWithUsers(caseId);
        if (!caseData || caseData.status !== 'in_session') {
          return socket.emit('error', { message: 'Courtroom is not in session' });
        }

        const userId = socket.dbUser.id;
        const room = getRoom(caseId);

        // Enforce presence of both plaintiff and defendant
        const isPlaintiffOnline = room.onlineUsers.has(caseData.plaintiffId);
        const isDefendantOnline = caseData.defendantId ? room.onlineUsers.has(caseData.defendantId) : false;
        if (!isPlaintiffOnline || !isDefendantOnline) {
          return socket.emit('error', { message: 'Both parties must be online to argue' });
        }

        // Check timeout
        if (isTimedOut(room, userId)) {
          const remaining = Math.ceil((room.timeouts[userId] - Date.now()) / 1000);
          return socket.emit('error', { message: `You are timed out. ${remaining}s remaining.` });
        }

        // Check rate limit
        if (!checkRateLimit(room, userId)) {
          return socket.emit('rate-limited', {
            message: 'Slow down! Too many messages. Wait a few seconds.',
          });
        }

        if (!content || content.trim().length === 0) {
          return socket.emit('error', { message: 'Message cannot be empty' });
        }

        if (content.length > 2000) {
          return socket.emit('error', { message: 'Message too long (max 2000 chars)' });
        }

        const [savedMsg] = await db.insert(messages).values({
          caseId,
          userId,
          sender: socket.side,
          type: 'message',
          content: content.trim(),
          metadata: null,
          attachmentUrl: attachmentUrl || null,
          attachmentType: attachmentType || null,
        }).returning();

        io.to(caseId).emit('new-message', savedMsg);

        room.messagesSinceJudge++;

        if (room.messagesSinceJudge >= 3) {
          triggerJudge(io, caseId);
        }
      } catch (err) {
        console.error('Send message error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('send-objection', async ({ content }) => {
      try {
        const caseId = socket.caseId;
        if (!caseId) return socket.emit('error', { message: 'Not in a courtroom' });
        if (socket.side === 'spectator') return socket.emit('error', { message: 'Spectators cannot send objections' });

        const caseData = await loadCaseWithUsers(caseId);
        if (!caseData || caseData.status !== 'in_session') {
          return socket.emit('error', { message: 'Courtroom is not in session' });
        }

        const userId = socket.dbUser.id;
        const room = getRoom(caseId);
        const side = socket.side;

        // Enforce presence of both plaintiff and defendant
        const isPlaintiffOnline = room.onlineUsers.has(caseData.plaintiffId);
        const isDefendantOnline = caseData.defendantId ? room.onlineUsers.has(caseData.defendantId) : false;
        if (!isPlaintiffOnline || !isDefendantOnline) {
          return socket.emit('error', { message: 'Both parties must be online to send objections' });
        }

        if (isTimedOut(room, userId)) {
          const remaining = Math.ceil((room.timeouts[userId] - Date.now()) / 1000);
          return socket.emit('error', { message: `You are timed out. ${remaining}s remaining.` });
        }

        if (room.objections[side] >= 2) {
          return socket.emit('error', { message: 'No objection tokens remaining!' });
        }

        if (!content || content.trim().length === 0) {
          return socket.emit('error', { message: 'Objection must include a reason' });
        }

        room.objections[side]++;

        const [savedMsg] = await db.insert(messages).values({
          caseId,
          userId,
          sender: side,
          type: 'objection',
          content: content.trim(),
          metadata: null,
        }).returning();

        io.to(caseId).emit('new-message', savedMsg);
        io.to(caseId).emit('objection-update', { objections: { ...room.objections } });

        // Objections always trigger the judge immediately
        triggerJudge(io, caseId);
      } catch (err) {
        console.error('Send objection error:', err);
        socket.emit('error', { message: 'Failed to send objection' });
      }
    });

    socket.on('typing', () => {
      if (socket.caseId && socket.side !== 'spectator') {
        socket.to(socket.caseId).emit('user-typing', {
          userId: socket.dbUser.id,
          username: socket.dbUser.username,
          side: socket.side,
        });
      }
    });

    socket.on('stop-typing', () => {
      if (socket.caseId && socket.side !== 'spectator') {
        socket.to(socket.caseId).emit('user-stop-typing', {
          userId: socket.dbUser.id,
          side: socket.side,
        });
      }
    });

    socket.on('force-verdict-vote', async () => {
      const caseId = socket.caseId;
      if (!caseId) return;
      if (socket.side === 'spectator') return;

      const room = getRoom(caseId);
      const side = socket.side;

      if (room.forceVerdictVotes[side]) return; // Already voted
      room.forceVerdictVotes[side] = true;

      io.to(caseId).emit('force-verdict-update', { votes: { ...room.forceVerdictVotes } });

      if (room.forceVerdictVotes.plaintiff && room.forceVerdictVotes.defendant) {
        // Both voted -- save a system message and trigger verdict
        const [sysMsg] = await db.insert(messages).values({
          caseId,
          userId: null,
          sender: 'judge',
          type: 'comment',
          content: 'Both parties have requested an immediate verdict. The court will now deliberate and deliver its ruling.',
          metadata: null,
        }).returning();
        io.to(caseId).emit('new-message', sysMsg);

        // Force judge with verdict intent
        room.messagesSinceJudge = 999;
        triggerJudge(io, caseId);

        // Reset votes
        room.forceVerdictVotes = { plaintiff: false, defendant: false };
      }
    });

    socket.on('disconnect', () => {
      if (socket.caseId) {
        const room = getRoom(socket.caseId);
        if (socket.side !== 'spectator') {
          room.onlineUsers.delete(socket.dbUser.id);
        }

        io.to(socket.caseId).emit('user-presence', {
          userId: socket.dbUser.id,
          username: socket.dbUser.username,
          side: socket.side,
          online: false,
          onlineUsers: Array.from(room.onlineUsers),
        });
      }
      console.log(`Socket disconnected: ${socket.dbUser?.username}`);
    });
  });
}
