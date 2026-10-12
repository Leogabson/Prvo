import { Router, type Response } from 'express';
import { eq, and, isNull, inArray, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, ideas, planLimits } from '../db/schema.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { updateMeSchema } from '@prvo/shared';
import { toSafeUser } from '../services/auth.js';

export const meRouter = Router();

/**
 * Helper to fetch a user's current idea usage and plan limit
 */
export async function getUserUsage(userId: string, plan: string): Promise<{ activeIdeas: number; limit: number }> {
  // Count active or draft ideas that are not soft-deleted
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ideas)
    .where(
      and(
        eq(ideas.userId, userId),
        inArray(ideas.status, ['active', 'draft']),
        isNull(ideas.deletedAt)
      )
    );

  const activeIdeas = countResult[0]?.count ?? 0;

  // Fetch limit from plan_limits table
  const limitResult = await db
    .select()
    .from(planLimits)
    .where(
      and(
        eq(planLimits.plan, plan),
        eq(planLimits.key, 'active_ideas')
      )
    )
    .limit(1);

  const limit = limitResult[0]?.value ?? 3;

  return { activeIdeas, limit };
}

/**
 * GET /me
 */
meRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.sub;

  const found = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  if (found.length === 0) {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'User profile not found',
    });
    return;
  }

  const user = found[0]!;
  const usage = await getUserUsage(user.id, user.plan);

  res.status(200).json({
    user: toSafeUser(user),
    usage,
  });
});

/**
 * PATCH /me
 */
meRouter.patch('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.sub;
  const parseResult = updateMeSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid profile update parameters',
      issues: parseResult.error.issues,
    });
    return;
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (parseResult.data.name !== undefined) {
    updates.name = parseResult.data.name;
  }
  if (parseResult.data.avatar_url !== undefined) {
    updates.avatarUrl = parseResult.data.avatar_url;
  }

  const updated = await db
    .update(users)
    .set(updates)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .returning();

  if (updated.length === 0) {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'User profile not found',
    });
    return;
  }

  const user = updated[0]!;
  const usage = await getUserUsage(user.id, user.plan);

  res.status(200).json({
    user: toSafeUser(user),
    usage,
  });
});
