import { Router } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth, syncUser } from '../middleware/auth.js';

const router = Router();

router.get('/me', requireAuth(), syncUser, (req, res) => {
  res.json(req.dbUser);
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
