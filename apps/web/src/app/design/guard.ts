/**
 * Determines if the /design testbed should be accessible.
 * Strictly blocked (404) in production environments.
 */
export function isDesignEnabled(env: string = process.env.NODE_ENV || 'development'): boolean {
  return env !== 'production';
}
