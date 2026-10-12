import { z } from 'zod';

/**
 * High-frequency insecure passwords disallowed by policy.
 */
export const COMMON_PASSWORDS = new Set([
  'password123',
  '1234567890',
  'qwertyuiop',
  'letmein123',
  'welcome123',
  'admin12345',
  'changeme123',
  'iloveyou12',
  'secret1234',
  'trustnoone1',
  'master1234',
  'football12',
  'dragon1234',
  'monkey1234',
  'sunshine12',
  'princess12',
]);

/**
 * Validates password strength:
 * - Minimum 10 characters
 * - Not present in common password blocklist
 */
export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters long')
  .max(128, 'Password cannot exceed 128 characters')
  .refine(
    (val) => !COMMON_PASSWORDS.has(val.toLowerCase().trim()),
    { message: 'This password is too common and easily guessed. Please choose a stronger password.' }
  );

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Please enter a valid email address');

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1, 'Name cannot be empty').max(100).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Reset token is required'),
  password: passwordSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const updateMeSchema = z.object({
  name: z.string().trim().min(1, 'Name cannot be empty').max(100).optional().nullable(),
  avatar_url: z.string().trim().url('Avatar must be a valid URL').optional().nullable(),
});

export type UpdateMeInput = z.infer<typeof updateMeSchema>;

export interface SafeUser {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  plan: string;
  created_at: string;
  updated_at: string;
}

export interface UserUsage {
  activeIdeas: number;
  limit: number;
}

export interface AuthResponse {
  user: SafeUser;
  accessToken: string;
  usage?: UserUsage;
}

export interface MeResponse {
  user: SafeUser;
  usage: UserUsage;
}
