import { Router } from 'express';
import { db } from '../db/index.js';
import { users, cases, arguments_, messages } from '../db/schema.js';
import { eq, or, and, desc, sql } from 'drizzle-orm';
import { requireAuth, syncUser } from '../middleware/auth.js';

const router = Router();

router.get('/me', requireAuth(), syncUser, (req, res) => {
  res.json(req.dbUser);
});

// Update current user's username
router.patch('/me', requireAuth(), syncUser, async (req, res, next) => {
  try {
    const { username } = req.body;
    if (!username?.trim() || username.trim().length < 2 || username.trim().length > 50) {
      return res.status(400).json({ error: 'Username must be 2-50 characters' });
    }

    const [updated] = await db
      .update(users)
      .set({ username: username.trim() })
      .where(eq(users.id, req.dbUser.id))
      .returning();

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Get current user's detailed stats + case history
router.get('/me/stats', requireAuth(), syncUser, async (req, res, next) => {
  try {
    const userId = req.dbUser.id;

    const userCases = await db
      .select()
      .from(cases)
      .where(or(eq(cases.plaintiffId, userId), eq(cases.defendantId, userId)))
      .orderBy(desc(cases.createdAt));

    const enrichedCases = await Promise.all(
      userCases.map(async (c) => {
        const [plaintiff] = await db
          .select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl })
          .from(users).where(eq(users.id, c.plaintiffId)).limit(1);
        const defendant = c.defendantId
          ? (await db.select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, c.defendantId)).limit(1))[0]
          : null;

        const role = c.plaintiffId === userId ? 'plaintiff' : 'defendant';
        let outcome = null;
        if (c.status === 'verdict_delivered') {
          if (c.verdictWinner === 'compromise') outcome = 'compromise';
          else if (c.verdictWinner === 'plaintiff_wins') outcome = role === 'plaintiff' ? 'won' : 'lost';
          else outcome = role === 'defendant' ? 'won' : 'lost';
        }

        return {
          id: c.id,
          title: c.title,
          status: c.status,
          role,
          outcome,
          plaintiff,
          defendant,
          judgePersona: c.judgePersona,
          dramaScore: c.dramaScore,
          createdAt: c.createdAt,
          resolvedAt: c.resolvedAt,
        };
      })
    );

    const [legacyObjectionCount] = await db
      .select({ count: sql`count(*)::int` })
      .from(arguments_)
      .where(sql`${arguments_.userId} = ${userId} AND ${arguments_.isObjection} = true`);

    const [realtimeObjectionCount] = await db
      .select({ count: sql`count(*)::int` })
      .from(messages)
      .where(and(eq(messages.userId, userId), eq(messages.type, 'objection')));

    const [legacyArgCount] = await db
      .select({ count: sql`count(*)::int` })
      .from(arguments_)
      .where(eq(arguments_.userId, userId));

    const [realtimeArgCount] = await db
      .select({ count: sql`count(*)::int` })
      .from(messages)
      .where(and(
        eq(messages.userId, userId),
        or(eq(messages.type, 'message'), eq(messages.type, 'objection'))
      ));

    const objectionCount = (legacyObjectionCount?.count || 0) + (realtimeObjectionCount?.count || 0);
    const totalArgCount = (legacyArgCount?.count || 0) + (realtimeArgCount?.count || 0);

    const totalCases = userCases.length;
    const resolved = userCases.filter((c) => c.status === 'verdict_delivered').length;
    const wins = enrichedCases.filter((c) => c.outcome === 'won').length;
    const losses = enrichedCases.filter((c) => c.outcome === 'lost').length;
    const winRate = (wins + losses) > 0
      ? Math.round((wins / (wins + losses)) * 100)
      : 0;

    res.json({
      user: req.dbUser,
      stats: {
        wins,
        losses,
        winRate,
        totalCases,
        resolvedCases: resolved,
        activeCases: totalCases - resolved,
        totalArguments: totalArgCount?.count || 0,
        objectionsUsed: objectionCount?.count || 0,
      },
      cases: enrichedCases,
    });
  } catch (err) {
    next(err);
  }
});

// Leaderboard with real case count
router.get('/leaderboard/rankings', async (req, res, next) => {
  try {
    const rankings = await db
      .select({
        id: users.id,
        username: users.username,
        avatarUrl: users.avatarUrl,
        wins: users.wins,
        losses: users.losses,
        totalCases: sql`(${users.wins} + ${users.losses})`.as('total_cases'),
        winRate: sql`CASE WHEN (${users.wins} + ${users.losses}) > 0 THEN ROUND(${users.wins}::numeric / (${users.wins} + ${users.losses}) * 100) ELSE 0 END`.as('win_rate'),
      })
      .from(users)
      .where(sql`(${users.wins} + ${users.losses}) > 0`)
      .orderBy(desc(users.wins), desc(sql`CASE WHEN (${users.wins} + ${users.losses}) > 0 THEN ${users.wins}::numeric / (${users.wins} + ${users.losses}) ELSE 0 END`))
      .limit(50);

    const [resolvedCount] = await db
      .select({ count: sql`count(*)::int` })
      .from(cases)
      .where(eq(cases.status, 'verdict_delivered'));

    res.json({
      rankings,
      totalResolvedCases: resolvedCount?.count || 0,
    });
  } catch (err) {
    next(err);
  }
});

// Recalculate win/loss for current user from actual case data
router.post('/me/recalc', requireAuth(), syncUser, async (req, res, next) => {
  try {
    const userId = req.dbUser.id;

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

    const [updated] = await db
      .update(users)
      .set({ wins: winCount?.count || 0, losses: lossCount?.count || 0 })
      .where(eq(users.id, userId))
      .returning();

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        avatarUrl: users.avatarUrl,
        wins: users.wins,
        losses: users.losses,
      })
      .from(users)
      .where(eq(users.id, req.params.id))
      .limit(1);

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
