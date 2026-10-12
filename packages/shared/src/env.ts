import { z } from 'zod';
import { DEFAULT_APP_URL, DEFAULT_API_URL, DEFAULT_LANDING_URL } from './brand';

const cleanString = z.string().transform((val) => val.trim().replace(/^["']|["']$/g, ''));

/**
 * Base URL validator that accepts http:// or https://.
 */
const urlSchema = cleanString
  .pipe(z.string().min(1, 'URL cannot be empty'))
  .refine((val) => {
    try {
      const parsed = new URL(val);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }, { message: 'Must be a valid HTTP or HTTPS URL' });

/**
 * PostgreSQL connection string validator.
 */
const postgresUrlSchema = cleanString
  .pipe(z.string().min(1, 'Database URL cannot be empty'))
  .refine((val) => {
    try {
      const parsed = new URL(val);
      return (
        parsed.protocol === 'postgresql:' ||
        parsed.protocol === 'postgres:'
      );
    } catch {
      return false;
    }
  }, { message: 'Must be a valid postgresql:// or postgres:// connection URL' });

/**
 * Common Node environment values
 */
export const nodeEnvSchema = z.enum(['development', 'production', 'test']).default('development');

/**
 * Express API environment schema
 */
export const apiEnvSchema = z
  .preprocess((val) => {
    if (val && typeof val === 'object') {
      const copy = { ...(val as Record<string, unknown>) };
      if (!copy.DATABASE_URL_UNPOOLED && copy.DATABASE_URL) {
        copy.DATABASE_URL_UNPOOLED = copy.DATABASE_URL;
      }
      if (copy.DATABASE_URL_POOLED && !copy.DATABASE_URL) {
        copy.DATABASE_URL = copy.DATABASE_URL_POOLED;
      }
      return copy;
    }
    return val;
  }, z.object({
    NODE_ENV: nodeEnvSchema,
    PORT: z
      .string()
      .default('4000')
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive().max(65535)),
    DATABASE_URL: postgresUrlSchema,
    DATABASE_URL_UNPOOLED: postgresUrlSchema,
    APP_URL: urlSchema.default(DEFAULT_APP_URL),
    API_URL: urlSchema.default(DEFAULT_API_URL),
    LANDING_URL: urlSchema.default(DEFAULT_LANDING_URL),
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters long'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long'),

    // Optional in development/test, but required in production
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_MODEL: z.string().default('claude-3-5-sonnet-20241022'),
    TAVILY_API_KEY: z.string().optional(),
    BRAVE_API_KEY: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
  }),
)
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      const requiredInProd: (keyof typeof data)[] = [
        'ANTHROPIC_API_KEY',
        'TAVILY_API_KEY',
        'BRAVE_API_KEY',
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
      ];

      for (const key of requiredInProd) {
        const val = data[key];
        if (typeof val !== 'string' || val.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is mandatory when NODE_ENV is 'production'`,
          });
        }
      }
    }
  });

export type ApiEnv = z.infer<typeof apiEnvSchema>;

/**
 * Web application environment schema (Next.js)
 */
export const webEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  NEXT_PUBLIC_APP_URL: urlSchema.default(DEFAULT_APP_URL),
  NEXT_PUBLIC_API_URL: urlSchema.default(DEFAULT_API_URL),
  NEXT_PUBLIC_LANDING_URL: urlSchema.default(DEFAULT_LANDING_URL),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

/**
 * Validates environment variables against a schema and throws descriptive, formatted error if invalid.
 */
export function validateEnv<T extends z.ZodTypeAny>(
  schema: T,
  rawEnv: Record<string, unknown> = process.env,
  contextName = 'Environment',
): z.infer<T> {
  const result = schema.safeParse(rawEnv);

  if (!result.success) {
    const formattedIssues = result.error.issues
      .map((issue) => `  - [${issue.path.join('.') || 'root'}]: ${issue.message}`)
      .join('\n');

    const errorMessage = `❌ [${contextName} Validation Error] Configuration failed with the following issues:\n${formattedIssues}\nCheck your .env file or deployment environment settings.`;

    throw new Error(errorMessage);
  }

  return result.data;
}
