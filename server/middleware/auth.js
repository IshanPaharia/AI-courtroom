import { clerkMiddleware, requireAuth, getAuth, clerkClient } from '@clerk/express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export { clerkMiddleware, requireAuth };

async function getClerkUserInfo(clerkUserId) {
  try {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const username =
      clerkUser.username ||
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
      clerkUser.emailAddresses?.[0]?.emailAddress?.split('@')[0] ||
      'Anonymous';
    const avatarUrl = clerkUser.imageUrl || null;
    return { username, avatarUrl };
  } catch {
    return { username: 'Anonymous', avatarUrl: null };
  }
}

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
      const { username, avatarUrl } = await getClerkUserInfo(auth.userId);
      [user] = await db
        .insert(users)
        .values({
          clerkId: auth.userId,
          username,
          avatarUrl,
        })
        .returning();
    } else if (user.username === 'Anonymous') {
      const { username, avatarUrl } = await getClerkUserInfo(auth.userId);
      if (username !== 'Anonymous') {
        [user] = await db
          .update(users)
          .set({ username, avatarUrl })
          .where(eq(users.id, user.id))
          .returning();
      }
    }

    req.dbUser = user;
    next();
  } catch (err) {
    next(err);
  }
}
