import { Router, type Response } from 'express';
import { eq, and, isNull, desc, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { ideas, ideaVersions, users } from '../db/schema.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { createIdeaSchema, updateIdeaSchema } from '@prvo/shared';
import { getUserUsage } from './me.js';

export const ideasRouter = Router();

// All idea routes require authentication
ideasRouter.use(requireAuth);

/**
 * Helper to fetch full idea with current version
 */
async function fetchIdeaWithVersion(ideaId: string, userId: string) {
  const ideaRows = await db
    .select()
    .from(ideas)
    .where(and(eq(ideas.id, ideaId), eq(ideas.userId, userId), isNull(ideas.deletedAt)))
    .limit(1);

  if (ideaRows.length === 0) return null;
  const idea = ideaRows[0]!;

  let currentVersion = null;
  if (idea.currentVersionId) {
    const versionRows = await db
      .select()
      .from(ideaVersions)
      .where(eq(ideaVersions.id, idea.currentVersionId))
      .limit(1);
    currentVersion = versionRows[0] || null;
  }

  return { idea, currentVersion };
}

/**
 * POST /ideas
 * Create an idea + version 1, enforcing plan limits
 */
ideasRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.sub;

  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userRows[0];
  if (!user) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'User not found' });
    return;
  }

  const parseResult = createIdeaSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid idea details',
      issues: parseResult.error.issues,
    });
    return;
  }

  const input = parseResult.data;

  // Enforce plan limits for active or draft ideas
  const usage = await getUserUsage(userId, user.plan);
  if (usage.activeIdeas >= usage.limit) {
    res.status(403).json({
      error: 'PLAN_LIMIT_REACHED',
      limit: usage.limit,
      count: usage.activeIdeas,
      message: `You have reached your limit of ${usage.limit} active ideas on the ${user.plan} plan.`,
    });
    return;
  }

  // Create idea and initial version
  const [newIdea] = await db
    .insert(ideas)
    .values({
      userId,
      title: input.title,
      status: input.status,
    })
    .returning();

  const [initialVersion] = await db
    .insert(ideaVersions)
    .values({
      ideaId: newIdea!.id,
      versionNumber: 1,
      title: input.title,
      problem: input.problem,
      targetCustomer: input.target_customer,
      solution: input.solution,
      businessModel: input.business_model,
      businessModelNote: input.business_model_note || null,
      stage: input.stage,
      industry: input.industry,
      industryOther: input.industry_other || null,
      region: input.region,
    })
    .returning();

  // Point current_version_id to initial version
  const [updatedIdea] = await db
    .update(ideas)
    .set({ currentVersionId: initialVersion!.id, updatedAt: new Date() })
    .where(eq(ideas.id, newIdea!.id))
    .returning();

  res.status(201).json({
    idea: updatedIdea,
    currentVersion: initialVersion,
  });
});

/**
 * GET /ideas
 * List own non-deleted ideas, newest first, optional status filter
 */
ideasRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.sub;
  const statusFilter = req.query.status as string | undefined;

  let conditions = and(eq(ideas.userId, userId), isNull(ideas.deletedAt));

  if (statusFilter && ['draft', 'active', 'archived'].includes(statusFilter)) {
    conditions = and(
      eq(ideas.userId, userId),
      eq(ideas.status, statusFilter as 'draft' | 'active' | 'archived'),
      isNull(ideas.deletedAt)
    );
  }

  const userIdeas = await db
    .select()
    .from(ideas)
    .where(conditions)
    .orderBy(desc(ideas.createdAt));

  // Fetch current versions for all ideas
  const currentVersionIds = userIdeas
    .map((i) => i.currentVersionId)
    .filter((id): id is string => id !== null);

  const versionsMap = new Map();
  if (currentVersionIds.length > 0) {
    const versions = await db
      .select()
      .from(ideaVersions)
      .where(inArray(ideaVersions.id, currentVersionIds));
    for (const v of versions) {
      versionsMap.set(v.id, v);
    }
  }

  const results = userIdeas.map((idea) => ({
    ...idea,
    currentVersion: idea.currentVersionId ? versionsMap.get(idea.currentVersionId) || null : null,
  }));

  res.status(200).json({
    ideas: results,
  });
});

function getParamId(req: AuthenticatedRequest): string {
  const id = req.params.id;
  return typeof id === 'string' ? id : '';
}

/**
 * GET /ideas/:id
 */
ideasRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.sub;
  const ideaId = getParamId(req);
  if (!ideaId) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Idea not found' });
    return;
  }

  const result = await fetchIdeaWithVersion(ideaId, userId);
  if (!result) {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Idea not found',
    });
    return;
  }

  res.status(200).json(result);
});

/**
 * PATCH /ideas/:id
 * Creates a NEW version row and updates current_version_id
 */
ideasRouter.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.sub;
  const ideaId = getParamId(req);
  if (!ideaId) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Idea not found' });
    return;
  }

  const current = await fetchIdeaWithVersion(ideaId, userId);
  if (!current) {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Idea not found',
    });
    return;
  }

  const parseResult = updateIdeaSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid update parameters',
      issues: parseResult.error.issues,
    });
    return;
  }

  const input = parseResult.data;

  // Determine latest version number
  const existingVersions = await db
    .select({ versionNumber: ideaVersions.versionNumber })
    .from(ideaVersions)
    .where(eq(ideaVersions.ideaId, ideaId))
    .orderBy(desc(ideaVersions.versionNumber))
    .limit(1);

  const latestNumber = existingVersions[0]?.versionNumber ?? 1;
  const newVersionNumber = latestNumber + 1;

  // Insert new version
  const [newVersion] = await db
    .insert(ideaVersions)
    .values({
      ideaId,
      versionNumber: newVersionNumber,
      title: input.title,
      problem: input.problem,
      targetCustomer: input.target_customer,
      solution: input.solution,
      businessModel: input.business_model,
      businessModelNote: input.business_model_note || null,
      stage: input.stage,
      industry: input.industry,
      industryOther: input.industry_other || null,
      region: input.region,
    })
    .returning();

  // Update idea with new version id and title
  const [updatedIdea] = await db
    .update(ideas)
    .set({
      currentVersionId: newVersion!.id,
      title: input.title,
      status: input.status || current.idea.status,
      updatedAt: new Date(),
    })
    .where(eq(ideas.id, ideaId))
    .returning();

  res.status(200).json({
    idea: updatedIdea,
    currentVersion: newVersion,
  });
});

/**
 * POST /ideas/:id/archive
 */
ideasRouter.post('/:id/archive', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.sub;
  const ideaId = getParamId(req);
  if (!ideaId) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Idea not found' });
    return;
  }

  const current = await fetchIdeaWithVersion(ideaId, userId);
  if (!current) {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Idea not found',
    });
    return;
  }

  const [archived] = await db
    .update(ideas)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(ideas.id, ideaId))
    .returning();

  res.status(200).json({
    message: 'Idea archived successfully',
    idea: archived,
  });
});

/**
 * POST /ideas/:id/restore
 */
ideasRouter.post('/:id/restore', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.sub;
  const ideaId = getParamId(req);
  if (!ideaId) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Idea not found' });
    return;
  }

  const current = await fetchIdeaWithVersion(ideaId, userId);
  if (!current) {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Idea not found',
    });
    return;
  }

  // If restoring an archived idea, verify plan limits
  if (current.idea.status === 'archived') {
    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = userRows[0]!;
    const usage = await getUserUsage(userId, user.plan);

    if (usage.activeIdeas >= usage.limit) {
      res.status(403).json({
        error: 'PLAN_LIMIT_REACHED',
        limit: usage.limit,
        count: usage.activeIdeas,
        message: `Cannot restore idea: you have reached your plan limit of ${usage.limit} active ideas.`,
      });
      return;
    }
  }

  const [restored] = await db
    .update(ideas)
    .set({ status: 'active', updatedAt: new Date() })
    .where(eq(ideas.id, ideaId))
    .returning();

  res.status(200).json({
    message: 'Idea restored successfully',
    idea: restored,
  });
});

/**
 * DELETE /ideas/:id
 * Soft deletes idea
 */
ideasRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.sub;
  const ideaId = getParamId(req);
  if (!ideaId) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Idea not found' });
    return;
  }

  const current = await fetchIdeaWithVersion(ideaId, userId);
  if (!current) {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Idea not found',
    });
    return;
  }

  await db
    .update(ideas)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(ideas.id, ideaId));

  res.status(200).json({
    message: 'Idea deleted successfully',
  });
});

/**
 * GET /ideas/:id/versions
 * List all historical versions
 */
ideasRouter.get('/:id/versions', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.sub;
  const ideaId = getParamId(req);
  if (!ideaId) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Idea not found' });
    return;
  }

  const current = await fetchIdeaWithVersion(ideaId, userId);
  if (!current) {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Idea not found',
    });
    return;
  }

  const versions = await db
    .select()
    .from(ideaVersions)
    .where(eq(ideaVersions.ideaId, ideaId))
    .orderBy(desc(ideaVersions.versionNumber));

  res.status(200).json({
    versions,
  });
});
