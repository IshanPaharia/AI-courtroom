import { Router } from 'express';
import { db } from '../db/index.js';
import { arguments_, cases } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, syncUser } from '../middleware/auth.js';

const router = Router();

const MAX_ROUNDS = 3;
const MAX_OBJECTIONS = 2;

const ROUND_STATUS_MAP = {
  1: 'opening_statements',
  2: 'rebuttals',
  3: 'closing_arguments',
};

// Submit an argument
router.post('/:caseId', requireAuth(), syncUser, async (req, res, next) => {
  try {
    const { content, isObjection } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });

    const [caseData] = await db.select().from(cases).where(eq(cases.id, req.params.caseId)).limit(1);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    if (caseData.status === 'pending_defendant' || caseData.status === 'verdict_delivered' || caseData.status === 'judging') {
      return res.status(400).json({ error: `Cannot submit arguments in ${caseData.status} status` });
    }

    const isPlaintiff = caseData.plaintiffId === req.dbUser.id;
    const isDefendant = caseData.defendantId === req.dbUser.id;
    if (!isPlaintiff && !isDefendant) return res.status(403).json({ error: 'You are not a party in this case' });

    const side = isPlaintiff ? 'plaintiff' : 'defendant';

    if (isObjection) {
      const [objCount] = await db
        .select({ count: sql`count(*)::int` })
        .from(arguments_)
        .where(and(eq(arguments_.caseId, caseData.id), eq(arguments_.userId, req.dbUser.id), eq(arguments_.isObjection, true)));

      if ((objCount?.count || 0) >= MAX_OBJECTIONS) {
        return res.status(400).json({ error: 'No objections remaining' });
      }
    }

    const existingArgs = await db
      .select()
      .from(arguments_)
      .where(eq(arguments_.caseId, caseData.id))
      .orderBy(arguments_.roundNumber, arguments_.createdAt);

    const currentRound = Math.floor(existingArgs.filter((a) => !a.isObjection).length / 2) + 1;

    if (!isObjection && currentRound > MAX_ROUNDS) {
      return res.status(400).json({ error: 'All rounds completed. Request a verdict.' });
    }

    // Check turn order (plaintiff goes first each round, unless objection)
    if (!isObjection) {
      const roundArgs = existingArgs.filter((a) => a.roundNumber === currentRound && !a.isObjection);
      if (side === 'plaintiff' && roundArgs.some((a) => a.side === 'plaintiff')) {
        return res.status(400).json({ error: 'You already submitted for this round' });
      }
      if (side === 'defendant' && !roundArgs.some((a) => a.side === 'plaintiff')) {
        return res.status(400).json({ error: 'Wait for plaintiff to go first' });
      }
      if (side === 'defendant' && roundArgs.some((a) => a.side === 'defendant')) {
        return res.status(400).json({ error: 'You already submitted for this round' });
      }
    }

    const [newArg] = await db
      .insert(arguments_)
      .values({
        caseId: caseData.id,
        userId: req.dbUser.id,
        side,
        roundNumber: isObjection ? currentRound : currentRound,
        content: content.trim(),
        isObjection: isObjection || false,
      })
      .returning();

    // Advance case status if both sides submitted
    if (!isObjection) {
      const updatedArgs = await db
        .select()
        .from(arguments_)
        .where(and(eq(arguments_.caseId, caseData.id), eq(arguments_.isObjection, false)));

      const nextRound = Math.floor(updatedArgs.length / 2) + 1;
      const statusForRound = ROUND_STATUS_MAP[Math.min(nextRound, MAX_ROUNDS)];

      if (updatedArgs.length % 2 === 0 && statusForRound && caseData.status !== statusForRound) {
        await db.update(cases).set({ status: statusForRound }).where(eq(cases.id, caseData.id));
      }
    }

    res.status(201).json(newArg);
  } catch (err) {
    next(err);
  }
});

// Get arguments for a case
router.get('/:caseId', async (req, res, next) => {
  try {
    const caseArgs = await db
      .select()
      .from(arguments_)
      .where(eq(arguments_.caseId, req.params.caseId))
      .orderBy(arguments_.roundNumber, arguments_.createdAt);

    res.json(caseArgs);
  } catch (err) {
    next(err);
  }
});

export default router;
