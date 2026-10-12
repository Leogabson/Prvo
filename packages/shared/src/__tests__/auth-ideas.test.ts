import { describe, it, expect } from 'vitest';
import { passwordSchema, registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../auth';
import { ideaFormSchema } from '../ideas';

describe('packages/shared: auth validation', () => {
  it('rejects passwords shorter than 10 characters', () => {
    const res = passwordSchema.safeParse('Short1!');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.message).toContain('at least 10 characters');
    }
  });

  it('rejects common passwords from blocklist even if >= 10 characters', () => {
    const res = passwordSchema.safeParse('password123');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.message).toContain('too common');
    }
  });

  it('accepts strong unique passwords', () => {
    const res = passwordSchema.safeParse('k8J#mP9$qL2!vX0');
    expect(res.success).toBe(true);
  });

  it('validates login schema properly', () => {
    expect(loginSchema.safeParse({ email: 'test@example.com', password: 'password123' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'bad-email', password: 'password123' }).success).toBe(false);
  });

  it('lowercases and trims email on register', () => {
    const res = registerSchema.safeParse({
      email: '  Test.User@Example.COM  ',
      password: 'StrongPassword123!',
      name: 'Test Founder',
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.email).toBe('test.user@example.com');
      expect(res.data.name).toBe('Test Founder');
    }
  });

  it('validates forgot password email format', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'bad-email' }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: 'valid@example.com' }).success).toBe(true);
  });

  it('validates reset password schema with token and valid password', () => {
    expect(resetPasswordSchema.safeParse({ token: '', password: 'StrongPassword123!' }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: 'abc-token', password: 'password123' }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: 'abc-token', password: 'StrongPassword123!' }).success).toBe(true);
  });
});

describe('packages/shared: ideas validation', () => {
  const validIdea = {
    title: 'Valid Idea Title',
    problem: 'Early stage founders struggle to test whether anyone will pay for their software.',
    target_customer: 'Solo SaaS founders and pre-seed product managers looking for validation.',
    solution: 'An automated testing workflow collecting market signals, surveys, and landing page metrics.',
    business_model: 'subscription' as const,
    stage: 'researching' as const,
    industry: 'b2b_saas' as const,
    region: 'North America and Europe',
    status: 'active' as const,
  };

  it('validates a complete and correct idea', () => {
    const res = ideaFormSchema.safeParse(validIdea);
    expect(res.success).toBe(true);
  });

  it('rejects title shorter than 3 characters or longer than 120 characters', () => {
    expect(ideaFormSchema.safeParse({ ...validIdea, title: 'No' }).success).toBe(false);
    expect(ideaFormSchema.safeParse({ ...validIdea, title: 'a'.repeat(121) }).success).toBe(false);
  });

  it('rejects problem shorter than 20 characters', () => {
    expect(ideaFormSchema.safeParse({ ...validIdea, problem: 'Too short problem' }).success).toBe(false);
  });

  it('requires industry_other when industry is "other"', () => {
    const resWithoutOther = ideaFormSchema.safeParse({
      ...validIdea,
      industry: 'other',
      industry_other: '',
    });
    expect(resWithoutOther.success).toBe(false);

    const resWithOther = ideaFormSchema.safeParse({
      ...validIdea,
      industry: 'other',
      industry_other: 'Space Exploration',
    });
    expect(resWithOther.success).toBe(true);
  });
});
