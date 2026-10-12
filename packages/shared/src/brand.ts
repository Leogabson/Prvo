/**
 * Single source of truth for Prvo brand identity, domains, and base URLs.
 * Never hardcode the product name or domains elsewhere in the codebase.
 */

export const BRAND_NAME = 'Prvo';
export const BRAND_TAGLINE = 'Proof before you build.';
export const BRAND_DOMAIN = 'prvo.app';
export const BRAND_SUPPORT_EMAIL = 'support@prvo.app';

export const DEFAULT_APP_URL = 'https://prvo.app';
export const DEFAULT_API_URL = 'https://api.prvo.app';
export const DEFAULT_LANDING_URL = 'https://go.prvo.app';

/**
 * Returns brand metadata with environment-overridable URLs.
 */
export function getBrandConfig(env: Partial<Record<string, string | undefined>> = typeof process !== 'undefined' ? process.env : {}) {
  const appUrl = (env.APP_URL || env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/$/, '');
  const apiUrl = (env.API_URL || env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/$/, '');
  const landingUrl = (env.LANDING_URL || env.NEXT_PUBLIC_LANDING_URL || DEFAULT_LANDING_URL).replace(/\/$/, '');

  return {
    name: BRAND_NAME,
    tagline: BRAND_TAGLINE,
    domain: BRAND_DOMAIN,
    supportEmail: BRAND_SUPPORT_EMAIL,
    urls: {
      app: appUrl,
      api: apiUrl,
      landing: landingUrl,
    },
    /**
     * Public survey URL generator (under main app origin)
     */
    getSurveyUrl: (slug: string) => `${appUrl}/s/${encodeURIComponent(slug)}`,
    /**
     * Isolated landing-page test URL generator (isolated origin)
     */
    getLandingTestUrl: (slug: string) => `${landingUrl}/${encodeURIComponent(slug)}`,
  };
}

export const brand = getBrandConfig();
