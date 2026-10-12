/**
 * Single source of truth for AI provider defaults and retirement warnings.
 * Never hardcode model names or retirement messages anywhere else.
 */

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';
export const DEFAULT_GEMINI_MODEL_FAST = 'gemini-3.1-flash-lite';

export const GEMINI_RETIREMENT_PREFIX = 'gemini-2.5';
export const GEMINI_RETIREMENT_MESSAGE =
  'Gemini 2.5 models are retiring on 16 October 2026.';

/**
 * Checks if model names start with deprecated prefix and outputs warnings.
 * Returns array of warning strings. Does NOT throw an error.
 */
export function checkGeminiModelWarnings(
  geminiModel?: string,
  geminiModelFast?: string,
  warnFn: (msg: string) => void = console.warn,
): string[] {
  const warnings: string[] = [];

  if (geminiModel && geminiModel.startsWith(GEMINI_RETIREMENT_PREFIX)) {
    const msg = `[DEPRECATION WARNING] GEMINI_MODEL '${geminiModel}': ${GEMINI_RETIREMENT_MESSAGE}`;
    warnings.push(msg);
    warnFn(msg);
  }

  if (geminiModelFast && geminiModelFast.startsWith(GEMINI_RETIREMENT_PREFIX)) {
    const msg = `[DEPRECATION WARNING] GEMINI_MODEL_FAST '${geminiModelFast}': ${GEMINI_RETIREMENT_MESSAGE}`;
    warnings.push(msg);
    warnFn(msg);
  }

  return warnings;
}
