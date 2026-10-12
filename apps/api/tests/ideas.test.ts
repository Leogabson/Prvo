import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { users, ideas, ideaVersions, refreshTokens, passwordResetTokens } from '../src/db/schema.js';

describe('Ideas API Integration & Authorization Tests', () => {
  const app = createApp();

  let userAToken: string;
  let userBToken: string;

  const validIdeaPayload = {
    title: 'Automated Idea Validation Platform',
    problem: 'Early stage founders spend months building things nobody actually wants or pays for.',
    target_customer: 'Pre-seed founders, indie hackers, and prospective startup builders.',
    solution: 'Algorithmic demand signals, rapid synthetic customer research, and instant landing page feedback.',
    business_model: 'subscription' as const,
    stage: 'researching' as const,
    industry: 'b2b_saas' as const,
    region: 'Global',
    status: 'active' as const,
  };

  beforeEach(async () => {
    // Clean up DB before each test
    await db.delete(ideaVersions);
    await db.delete(ideas);
    await db.delete(refreshTokens);
    await db.delete(passwordResetTokens);
    await db.delete(users);

    // Register User A
    const resA = await request(app).post('/auth/register').send({
      email: 'userA@prvo.test',
      password: 'StrongPassword123!',
      name: 'User A',
    });
    userAToken = resA.body.accessToken;

    // Register User B
    const resB = await request(app).post('/auth/register').send({
      email: 'userB@prvo.test',
      password: 'StrongPassword123!',
      name: 'User B',
    });
    userBToken = resB.body.accessToken;
  });

  afterAll(async () => {
    await db.delete(ideaVersions);
    await db.delete(ideas);
    await db.delete(refreshTokens);
    await db.delete(passwordResetTokens);
    await db.delete(users);
  });

  it('POST /ideas creates idea + version 1 and links current_version_id', async () => {
    const res = await request(app)
      .post('/ideas')
      .set('Authorization', `Bearer ${userAToken}`)
      .send(validIdeaPayload);

    expect(res.status).toBe(201);
    expect(res.body.idea).toBeDefined();
    expect(res.body.idea.title).toBe(validIdeaPayload.title);
    expect(res.body.currentVersion).toBeDefined();
    expect(res.body.currentVersion.versionNumber).toBe(1);
    expect(res.body.idea.currentVersionId).toBe(res.body.currentVersion.id);
  });

  it('Authorization: User B receives 404 when attempting to access, edit, archive, or delete User A idea', async () => {
    // User A creates an idea
    const createRes = await request(app)
      .post('/ideas')
      .set('Authorization', `Bearer ${userAToken}`)
      .send(validIdeaPayload);

    const ideaId = createRes.body.idea.id;

    // User B attempts GET /ideas/:id -> Expect 404 (not 403)
    const getRes = await request(app)
      .get(`/ideas/${ideaId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(getRes.status).toBe(404);
    expect(getRes.body.error).toBe('NOT_FOUND');

    // User B attempts PATCH /ideas/:id -> Expect 404
    const patchRes = await request(app)
      .patch(`/ideas/${ideaId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ ...validIdeaPayload, title: 'Hacked Idea Title' });
    expect(patchRes.status).toBe(404);

    // User B attempts POST /ideas/:id/archive -> Expect 404
    const archiveRes = await request(app)
      .post(`/ideas/${ideaId}/archive`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(archiveRes.status).toBe(404);

    // User B attempts DELETE /ideas/:id -> Expect 404
    const deleteRes = await request(app)
      .delete(`/ideas/${ideaId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(deleteRes.status).toBe(404);

    // User B GET /ideas -> User A's idea is not returned
    const listRes = await request(app)
      .get('/ideas')
      .set('Authorization', `Bearer ${userBToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.ideas).toHaveLength(0);
  });

  it('Versioning: PATCH /ideas/:id creates version 2 and preserves version 1 history', async () => {
    // User A creates idea (v1)
    const createRes = await request(app)
      .post('/ideas')
      .set('Authorization', `Bearer ${userAToken}`)
      .send(validIdeaPayload);

    const ideaId = createRes.body.idea.id;
    const v1Id = createRes.body.currentVersion.id;

    // User A updates idea
    const updatePayload = {
      ...validIdeaPayload,
      title: 'Updated Idea Title V2',
      solution: 'Refined solution offering real-time AI market analysis and automated demand verification.',
    };

    const patchRes = await request(app)
      .patch(`/ideas/${ideaId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send(updatePayload);

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.idea.title).toBe(updatePayload.title);
    expect(patchRes.body.currentVersion.versionNumber).toBe(2);
    expect(patchRes.body.currentVersion.id).not.toBe(v1Id);

    // Fetch version history
    const versionsRes = await request(app)
      .get(`/ideas/${ideaId}/versions`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(versionsRes.status).toBe(200);
    expect(versionsRes.body.versions).toHaveLength(2);
    expect(versionsRes.body.versions[0].versionNumber).toBe(2);
    expect(versionsRes.body.versions[1].versionNumber).toBe(1);
    expect(versionsRes.body.versions[1].title).toBe(validIdeaPayload.title);
  });

  it('Plan Limit: Enforces 3 active ideas limit and allows new idea after archiving', async () => {
    // Create 3 active ideas (hits the limit)
    for (let i = 1; i <= 3; i++) {
      const res = await request(app)
        .post('/ideas')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          ...validIdeaPayload,
          title: `Active Startup Idea ${i}`,
        });
      expect(res.status).toBe(201);
    }

    // 4th active idea attempt must fail with 403 PLAN_LIMIT_REACHED
    const fourthRes = await request(app)
      .post('/ideas')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        ...validIdeaPayload,
        title: 'Fourth Idea Exceeding Limit',
      });

    expect(fourthRes.status).toBe(403);
    expect(fourthRes.body.error).toBe('PLAN_LIMIT_REACHED');
    expect(fourthRes.body.limit).toBe(3);
    expect(fourthRes.body.count).toBe(3);

    // List ideas to get an ID to archive
    const listRes = await request(app)
      .get('/ideas')
      .set('Authorization', `Bearer ${userAToken}`);
    const ideaToArchive = listRes.body.ideas[0];

    // Archive one idea -> frees a slot
    const archiveRes = await request(app)
      .post(`/ideas/${ideaToArchive.id}/archive`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(archiveRes.status).toBe(200);

    // Now 4th idea can be created successfully!
    const retryRes = await request(app)
      .post('/ideas')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        ...validIdeaPayload,
        title: 'Fourth Idea Now Allowed',
      });

    expect(retryRes.status).toBe(201);
  });

  it('DELETE /ideas/:id soft-deletes and removes from active listing', async () => {
    const createRes = await request(app)
      .post('/ideas')
      .set('Authorization', `Bearer ${userAToken}`)
      .send(validIdeaPayload);

    const ideaId = createRes.body.idea.id;

    // Delete
    const delRes = await request(app)
      .delete(`/ideas/${ideaId}`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(delRes.status).toBe(200);

    // GET /ideas/:id returns 404
    const getRes = await request(app)
      .get(`/ideas/${ideaId}`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(getRes.status).toBe(404);

    // GET /ideas does not list soft-deleted ideas
    const listRes = await request(app)
      .get('/ideas')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(listRes.body.ideas).toHaveLength(0);
  });
});
