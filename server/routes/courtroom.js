import { Router } from 'express';
import { db } from '../db/index.js';
import { cases, users, messages } from '../db/schema.js';
import { eq, and, gt, asc, desc, sql, or } from 'drizzle-orm';
import { requireAuth, syncUser } from '../middleware/auth.js';
import { getJudgeInterjection } from '../services/judge.js';

const router = Router();

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

async function recalcWinLoss(userId) {
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

async function getActiveTimeout(caseId, side) {
  const [lastTimeout] = await db
    .select()
    .from(messages)
    .where(and(eq(messages.caseId, caseId), eq(messages.type, 'timeout')))
    .orderBy(desc(messages.createdAt))
    .limit(1);

  if (!lastTimeout) return null;

  const meta = JSON.parse(lastTimeout.metadata || '{}');
  if (meta.target !== side) return null;

  const duration = (meta.duration || 60) * 1000;
  const elapsed = Date.now() - new Date(lastTimeout.createdAt).getTime();
  if (elapsed >= duration) return null;

  return {
    target: meta.target,
    remaining: Math.ceil((duration - elapsed) / 1000),
    reason: lastTimeout.content,
  };
}

async function getForceVerdictVotes(caseId) {
  const [lastJudge] = await db
    .select()
    .from(messages)
    .where(and(eq(messages.caseId, caseId), eq(messages.sender, 'judge')))
    .orderBy(desc(messages.createdAt))
    .limit(1);

  const conditions = [
    eq(messages.caseId, caseId),
    eq(messages.type, 'force_verdict_vote'),
  ];
  if (lastJudge) {
    conditions.push(gt(messages.createdAt, lastJudge.createdAt));
  }

  const votes = await db
    .select()
    .from(messages)
    .where(and(...conditions));

  return {
    plaintiff: votes.some((v) => v.sender === 'plaintiff'),
    defendant: votes.some((v) => v.sender === 'defendant'),
  };
}

async function isRateLimited(caseId, userId) {
  const window = new Date(Date.now() - 30_000);
  const [count] = await db
    .select({ count: sql`count(*)::int` })
    .from(messages)
    .where(and(
      eq(messages.caseId, caseId),
      eq(messages.userId, userId),
      gt(messages.createdAt, window)
    ));
  return (count?.count || 0) >= 5;
}

async function tryTriggerJudge(caseId, forceVerdict = false) {
  try {
    const caseData = await loadCaseWithUsers(caseId);
    if (!caseData || caseData.status !== 'in_session') return [];

    const chatMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.caseId, caseId))
      .orderBy(asc(messages.createdAt));

    if (!forceVerdict && chatMessages.length > 0 && chatMessages[chatMessages.length - 1].sender === 'judge') {
      return [];
    }

    const result = await getJudgeInterjection({
      caseData,
      forceVerdict,
      chatMessages,
      persona: caseData.judgePersona,
    });

    if (result.type === 'silent') return [];

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
    }

    return [savedMsg];
  } catch (err) {
    console.error('Judge trigger error:', err);
    return [];
  }
}

function sanitizeUser(u) {
  if (!u) return null;
  return { id: u.id, username: u.username, avatarUrl: u.avatarUrl };
}

// GET /api/courtroom/:caseId — full courtroom state
router.get('/:caseId', requireAuth(), syncUser, async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const caseData = await loadCaseWithUsers(caseId);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    const userId = req.dbUser.id;
    const isPlaintiff = caseData.plaintiffId === userId;
    const isDefendant = caseData.defendantId === userId;
    if (!isPlaintiff && !isDefendant) {
      return res.status(403).json({ error: 'You are not a party in this case' });
    }

    const yourSide = isPlaintiff ? 'plaintiff' : 'defendant';

    let allMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.caseId, caseId))
      .orderBy(asc(messages.createdAt));

    // Send intro message if fresh in_session with no messages
    if (caseData.status === 'in_session' && allMessages.length === 0) {
      const introContent = `Court is now in session! The case "${caseData.title}" will be heard. ${caseData.plaintiffName}, please present your complaint. ${caseData.defendantName}, you will have your chance to respond. I will be monitoring and may interject at any time. Let's begin!`;
      const [intro] = await db.insert(messages).values({
        caseId,
        userId: null,
        sender: 'judge',
        type: 'comment',
        content: introContent,
        metadata: null,
      }).returning();
      allMessages = [intro];
    }

    const votes = await getForceVerdictVotes(caseId);
    const timeout = await getActiveTimeout(caseId, yourSide);

    res.json({
      caseData: {
        id: caseData.id,
        title: caseData.title,
        description: caseData.description,
        requestedCompensation: caseData.requestedCompensation,
        judgePersona: caseData.judgePersona,
        status: caseData.status,
        plaintiff: sanitizeUser(caseData.plaintiff),
        defendant: sanitizeUser(caseData.defendant),
        isAppeal: caseData.isAppeal,
        appealedFromId: caseData.appealedFromId,
      },
      messages: allMessages,
      yourSide,
      forceVerdictVotes: votes,
      activeTimeout: timeout,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/courtroom/:caseId/poll?after=<ISO timestamp>
router.get('/:caseId/poll', requireAuth(), syncUser, async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const { after } = req.query;

    const [caseData] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    const userId = req.dbUser.id;
    if (caseData.plaintiffId !== userId && caseData.defendantId !== userId) {
      return res.status(403).json({ error: 'Not a party' });
    }

    const yourSide = caseData.plaintiffId === userId ? 'plaintiff' : 'defendant';

    let newMessages = [];
    if (after) {
      newMessages = await db
        .select()
        .from(messages)
        .where(and(eq(messages.caseId, caseId), gt(messages.createdAt, new Date(after))))
        .orderBy(asc(messages.createdAt));
    }

    const votes = await getForceVerdictVotes(caseId);
    const timeout = await getActiveTimeout(caseId, yourSide);

    res.json({
      messages: newMessages,
      caseStatus: caseData.status,
      forceVerdictVotes: votes,
      activeTimeout: timeout,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/courtroom/:caseId/message
router.post('/:caseId/message', requireAuth(), syncUser, async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const { content, attachmentUrl, attachmentType } = req.body;

    const caseData = await loadCaseWithUsers(caseId);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });
    if (caseData.status !== 'in_session') {
      return res.status(400).json({ error: 'Case is not in session' });
    }

    const userId = req.dbUser.id;
    const isPlaintiff = caseData.plaintiffId === userId;
    const isDefendant = caseData.defendantId === userId;
    if (!isPlaintiff && !isDefendant) {
      return res.status(403).json({ error: 'Not a party in this case' });
    }

    const side = isPlaintiff ? 'plaintiff' : 'defendant';

    // Check timeout
    const timeout = await getActiveTimeout(caseId, side);
    if (timeout) {
      return res.status(429).json({ error: `You are muted. ${timeout.remaining}s remaining.` });
    }

    // Check rate limit
    if (await isRateLimited(caseId, userId)) {
      return res.status(429).json({ error: 'Slow down! Too many messages. Wait a few seconds.' });
    }

    if (!content?.trim() && !attachmentUrl) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    if (content && content.length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 chars)' });
    }

    const [savedMsg] = await db.insert(messages).values({
      caseId,
      userId,
      sender: side,
      type: 'message',
      content: (content || '').trim(),
      metadata: null,
      attachmentUrl: attachmentUrl || null,
      attachmentType: attachmentType || null,
    }).returning();

    // Count non-judge messages since last judge message
    const [lastJudge] = await db
      .select()
      .from(messages)
      .where(and(eq(messages.caseId, caseId), eq(messages.sender, 'judge')))
      .orderBy(desc(messages.createdAt))
      .limit(1);

    const countConditions = [
      eq(messages.caseId, caseId),
      sql`${messages.sender} IN ('plaintiff', 'defendant')`,
    ];
    if (lastJudge) {
      countConditions.push(gt(messages.createdAt, lastJudge.createdAt));
    }
    const [msgCount] = await db
      .select({ count: sql`count(*)::int` })
      .from(messages)
      .where(and(...countConditions));

    let judgeMessages = [];
    if ((msgCount?.count || 0) >= 3) {
      judgeMessages = await tryTriggerJudge(caseId);
    }

    res.json({ message: savedMsg, judgeMessages });
  } catch (err) {
    next(err);
  }
});

// POST /api/courtroom/:caseId/force-verdict
router.post('/:caseId/force-verdict', requireAuth(), syncUser, async (req, res, next) => {
  try {
    const { caseId } = req.params;

    const [caseData] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });
    if (caseData.status !== 'in_session') {
      return res.status(400).json({ error: 'Case is not in session' });
    }

    const userId = req.dbUser.id;
    const isPlaintiff = caseData.plaintiffId === userId;
    const isDefendant = caseData.defendantId === userId;
    if (!isPlaintiff && !isDefendant) {
      return res.status(403).json({ error: 'Not a party' });
    }

    const side = isPlaintiff ? 'plaintiff' : 'defendant';

    // Check if already voted (since last judge message)
    const votes = await getForceVerdictVotes(caseId);
    if (votes[side]) {
      return res.json({ votes, judgeMessages: [], alreadyVoted: true });
    }

    // Cast vote as a hidden message
    await db.insert(messages).values({
      caseId,
      userId,
      sender: side,
      type: 'force_verdict_vote',
      content: `${side} voted for immediate verdict`,
      metadata: null,
    });

    const updatedVotes = await getForceVerdictVotes(caseId);
    let judgeMessages = [];

    // Both voted — trigger forced verdict
    if (updatedVotes.plaintiff && updatedVotes.defendant) {
      const [sysMsg] = await db.insert(messages).values({
        caseId,
        userId: null,
        sender: 'judge',
        type: 'comment',
        content: 'Both parties have requested an immediate verdict. The court will now deliberate and deliver its ruling.',
        metadata: null,
      }).returning();

      judgeMessages.push(sysMsg);

      const verdictMsgs = await tryTriggerJudge(caseId, true);
      judgeMessages.push(...verdictMsgs);
    }

    res.json({ votes: updatedVotes, judgeMessages, alreadyVoted: false });
  } catch (err) {
    next(err);
  }
});

export default router;
