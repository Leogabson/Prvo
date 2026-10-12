import { describe, it, expect, vi, beforeEach } from 'vitest';

const { notFoundMock } = vi.hoisted(() => {
  return {
    notFoundMock: vi.fn(() => {
      throw new Error('NEXT_NOT_FOUND');
    }),
  };
});

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}));

import DesignPage from '../app/design/page';
import { isDesignEnabled } from '../app/design/guard';

describe('Design page production guard', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
  });

  it('allows access in development and test environments', () => {
    expect(isDesignEnabled('development')).toBe(true);
    expect(isDesignEnabled('test')).toBe(true);
  });

  it('disallows access in production environment', () => {
    expect(isDesignEnabled('production')).toBe(false);
  });

  it('calls notFound() when accessed in production mode', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

    expect(() => DesignPage()).toThrow('NEXT_NOT_FOUND');
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it('renders DesignView without calling notFound() in non-production mode', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';

    const result = DesignPage();
    expect(notFoundMock).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});
