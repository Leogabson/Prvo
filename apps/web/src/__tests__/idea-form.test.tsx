import { describe, it, expect } from 'vitest';
import { createIdeaSchema } from '@prvo/shared';

describe('Idea Form Validation', () => {
  it('rejects submissions with titles shorter than 3 characters', () => {
    const result = createIdeaSchema.safeParse({
      title: 'ab',
      problem: 'This is a long enough problem description for validation',
      target_customer: 'Early stage startup founders',
      solution: 'A simple validation platform that collects real customer signal',
      business_model: 'subscription',
      stage: 'idea_only',
      industry: 'b2b_saas',
      region: 'North America',
      status: 'active',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.title).toBeDefined();
    }
  });

  it('rejects submissions with problems shorter than 20 characters', () => {
    const result = createIdeaSchema.safeParse({
      title: 'Valid Startup Idea',
      problem: 'Too short',
      target_customer: 'Early stage startup founders',
      solution: 'A simple validation platform that collects real customer signal',
      business_model: 'subscription',
      stage: 'idea_only',
      industry: 'b2b_saas',
      region: 'North America',
      status: 'active',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.problem).toBeDefined();
    }
  });

  it('requires industry_other when industry is set to "other"', () => {
    const result = createIdeaSchema.safeParse({
      title: 'Space Mining Co',
      problem: 'Asteroids contain valuable rare metals that are scarce on Earth',
      target_customer: 'Global manufacturing conglomerates and satellite operators',
      solution: 'Autonomous robotic mining probes launched into near-Earth orbit',
      business_model: 'other',
      stage: 'prototype',
      industry: 'other',
      industry_other: '',
      region: 'Global',
      status: 'active',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.industry_other).toBeDefined();
    }
  });

  it('passes validation with valid and complete inputs', () => {
    const result = createIdeaSchema.safeParse({
      title: 'Valid Idea Title',
      problem: 'Founders spend too much time building without validating market demand first',
      target_customer: 'Pre-seed and bootstrap software founders',
      solution: 'Structured idea intake with fast evidence-backed validation reports',
      business_model: 'subscription',
      stage: 'researching',
      industry: 'b2b_saas',
      region: 'Worldwide',
      status: 'active',
    });

    expect(result.success).toBe(true);
  });
});
