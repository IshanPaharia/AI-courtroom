import { Router } from 'express';
import { db } from '../db/index.js';
import { cases, users, arguments_, messages } from '../db/schema.js';
import { eq, or, desc, sql, and } from 'drizzle-orm';
import { requireAuth, syncUser } from '../middleware/auth.js';
import { getVerdict } from '../services/judge.js';

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

const router = Router();

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

const VALID_TRANSITIONS = {
  pending_defendant: ['opening_statements'],
  opening_statements: ['rebuttals'],
  rebuttals: ['closing_arguments'],
  closing_arguments: ['judging'],
  judging: ['verdict_delivered'],
  verdict_delivered: ['appealed'],
};

// Get all cases for current user
router.get('/', requireAuth(), syncUser, async (req, res, next) => {
  try {
    const userCases = await db
      .select()
      .from(cases)
      .where(
        or(
          eq(cases.plaintiffId, req.dbUser.id),
          eq(cases.defendantId, req.dbUser.id)
        )
      )
      .orderBy(desc(cases.createdAt));

    const enriched = await Promise.all(
      userCases.map(async (c) => {
        const [plaintiff] = await db.select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, c.plaintiffId)).limit(1);
        const defendant = c.defendantId
          ? (await db.select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, c.defendantId)).limit(1))[0]
          : null;

        const [argCount] = await db
          .select({ count: sql`count(*)::int` })
          .from(arguments_)
          .where(eq(arguments_.caseId, c.id));

        return {
          ...c,
          plaintiff,
          defendant,
          roundsCompleted: Math.ceil((argCount?.count || 0) / 2),
          totalRounds: 3,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// Get single case by ID
router.get('/:id', requireAuth(), syncUser, async (req, res, next) => {
  try {
    const [caseData] = await db
      .select()
      .from(cases)
      .where(eq(cases.id, req.params.id))
      .limit(1);

    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    const [plaintiff] = await db.select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, caseData.plaintiffId)).limit(1);
    const defendant = caseData.defendantId
      ? (await db.select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, caseData.defendantId)).limit(1))[0]
      : null;

    const caseArgs = await db
      .select()
      .from(arguments_)
      .where(eq(arguments_.caseId, caseData.id))
      .orderBy(arguments_.roundNumber, arguments_.createdAt);

    res.json({
      ...caseData,
      plaintiff,
      defendant,
      arguments: caseArgs,
      roundsCompleted: Math.ceil(caseArgs.length / 2),
      totalRounds: 3,
    });
  } catch (err) {
    next(err);
  }
});

// Create a new case
router.post('/', requireAuth(), syncUser, async (req, res, next) => {
  try {
    const { title, description, requestedCompensation, judgePersona } = req.body;

    if (!title || !description || !requestedCompensation) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [newCase] = await db
      .insert(cases)
      .values({
        plaintiffId: req.dbUser.id,
        inviteCode: generateInviteCode(),
        title,
        description,
        requestedCompensation,
        judgePersona: judgePersona || 'strict',
        status: 'pending_defendant',
      })
      .returning();

    res.status(201).json(newCase);
  } catch (err) {
    next(err);
  }
});

// Join a case as defendant via invite code
router.post('/join/:inviteCode', requireAuth(), syncUser, async (req, res, next) => {
  try {
    const [caseData] = await db
      .select()
      .from(cases)
      .where(eq(cases.inviteCode, req.params.inviteCode))
      .limit(1);

    if (!caseData) return res.status(404).json({ error: 'Case not found' });
    if (caseData.defendantId) return res.status(400).json({ error: 'Case already has a defendant' });
    if (caseData.plaintiffId === req.dbUser.id) return res.status(400).json({ error: 'Cannot join your own case as defendant' });

    const [updated] = await db
      .update(cases)
      .set({
        defendantId: req.dbUser.id,
        status: 'in_session',
      })
      .where(eq(cases.id, caseData.id))
      .returning();

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Request verdict (trigger AI judge)
router.post('/:id/verdict', requireAuth(), syncUser, async (req, res, next) => {
  try {
    const [caseData] = await db.select().from(cases).where(eq(cases.id, req.params.id)).limit(1);

    if (!caseData) return res.status(404).json({ error: 'Case not found' });
    if (caseData.status === 'verdict_delivered') return res.status(400).json({ error: 'Verdict already delivered' });

    let caseArgs = await db
      .select()
      .from(arguments_)
      .where(eq(arguments_.caseId, caseData.id))
      .orderBy(arguments_.roundNumber, arguments_.createdAt);

    // Fallback to real-time messages if no legacy arguments exist
    if (caseArgs.length === 0) {
      const chatMessages = await db
        .select()
        .from(messages)
        .where(and(eq(messages.caseId, caseData.id), or(eq(messages.type, 'message'), eq(messages.type, 'objection'))))
        .orderBy(messages.createdAt);

      caseArgs = chatMessages.map((m, idx) => ({
        id: m.id,
        caseId: m.caseId,
        userId: m.userId,
        side: m.sender,
        roundNumber: Math.floor(idx / 2) + 1,
        content: m.content,
        isObjection: m.type === 'objection',
        createdAt: m.createdAt,
      }));
    }

    if (caseArgs.length < 2) {
      return res.status(400).json({ error: 'Both sides must present at least one argument' });
    }

    const previousStatus = caseData.status;
    await db.update(cases).set({ status: 'judging' }).where(eq(cases.id, caseData.id));

    let verdict;
    try {
      verdict = await getVerdict({
        caseData,
        arguments: caseArgs,
        persona: caseData.judgePersona,
      });
    } catch (aiError) {
      // Roll back status so the user can retry
      await db.update(cases).set({ status: previousStatus }).where(eq(cases.id, caseData.id));
      return res.status(502).json({ error: `AI Judge failed: ${aiError.message}` });
    }

    const [updated] = await db
      .update(cases)
      .set({
        status: 'verdict_delivered',
        verdictText: verdict.reasoning,
        verdictWinner: verdict.verdict,
        finalCompensation: verdict.compensation,
        dramaScore: verdict.drama_score,
        notableQuote: verdict.notable_quote,
        resolvedAt: new Date(),
      })
      .where(eq(cases.id, caseData.id))
      .returning();

    // Recalculate win/loss from actual case data (prevents double-counting)
    await recalcWinLoss(caseData.plaintiffId);
    if (caseData.defendantId) await recalcWinLoss(caseData.defendantId);

    res.json({ ...updated, verdict });
  } catch (err) {
    next(err);
  }
});

// Reset a stuck "judging" case back to allow retrying verdict
router.post('/:id/reset', requireAuth(), syncUser, async (req, res, next) => {
  try {
    const [caseData] = await db.select().from(cases).where(eq(cases.id, req.params.id)).limit(1);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });
    if (caseData.status !== 'judging') return res.status(400).json({ error: 'Case is not stuck' });

    const [argCount] = await db
      .select({ count: sql`count(*)::int` })
      .from(arguments_)
      .where(eq(arguments_.caseId, caseData.id));

    const rounds = Math.ceil((argCount?.count || 0) / 2);
    const statusMap = { 1: 'opening_statements', 2: 'rebuttals', 3: 'closing_arguments' };
    const resetStatus = statusMap[Math.min(rounds, 3)] || 'closing_arguments';

    const [updated] = await db
      .update(cases)
      .set({ status: resetStatus })
      .where(eq(cases.id, caseData.id))
      .returning();

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Appeal a verdict
router.post('/:id/appeal', requireAuth(), syncUser, async (req, res, next) => {
  try {
    const [caseData] = await db.select().from(cases).where(eq(cases.id, req.params.id)).limit(1);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });
    if (caseData.status !== 'verdict_delivered') return res.status(400).json({ error: 'Case has no verdict to appeal' });

    // Only the loser can appeal
    const userId = req.dbUser.id;
    const isLoser =
      (caseData.verdictWinner === 'plaintiff_wins' && caseData.defendantId === userId) ||
      (caseData.verdictWinner === 'defendant_wins' && caseData.plaintiffId === userId);

    if (!isLoser && caseData.verdictWinner !== 'compromise') {
      return res.status(403).json({ error: 'Only the losing party can appeal' });
    }

    // Check if already appealed
    const [existingAppeal] = await db
      .select()
      .from(cases)
      .where(eq(cases.appealedFromId, caseData.id))
      .limit(1);

    if (existingAppeal) {
      return res.status(400).json({ error: 'This case has already been appealed', appealCaseId: existingAppeal.id });
    }

    const [appealCase] = await db
      .insert(cases)
      .values({
        plaintiffId: caseData.plaintiffId,
        defendantId: caseData.defendantId,
        inviteCode: generateInviteCode(),
        title: `[APPEAL] ${caseData.title}`,
        description: caseData.description,
        requestedCompensation: caseData.requestedCompensation,
        judgePersona: caseData.judgePersona,
        status: 'in_session',
        appealedFromId: caseData.id,
        isAppeal: true,
      })
      .returning();

    res.status(201).json(appealCase);
  } catch (err) {
    next(err);
  }
});

// Check if a case has been appealed
router.get('/:id/appeal', requireAuth(), syncUser, async (req, res, next) => {
  try {
    const [appealCase] = await db
      .select()
      .from(cases)
      .where(eq(cases.appealedFromId, req.params.id))
      .limit(1);

    res.json({ appeal: appealCase || null });
  } catch (err) {
    next(err);
  }
});

export default router;
