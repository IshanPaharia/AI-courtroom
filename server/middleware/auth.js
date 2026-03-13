import { clerkMiddleware, requireAuth, getAuth } from '@clerk/express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export { clerkMiddleware, requireAuth };

export async function syncUser(req, res, next) {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) return next();

    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, auth.userId))
      .limit(1);

    if (!user) {
      [user] = await db
        .insert(users)
        .values({
          clerkId: auth.userId,
          username: auth.sessionClaims?.username || auth.sessionClaims?.email || 'Anonymous',
          avatarUrl: auth.sessionClaims?.image_url || null,
        })
        .returning();
    }

    req.dbUser = user;
    next();
  } catch (err) {
    next(err);
  }
}
