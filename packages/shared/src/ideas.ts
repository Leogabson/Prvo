import { z } from 'zod';

export const BUSINESS_MODELS = [
  'subscription',
  'marketplace',
  'advertising',
  'one_time_sale',
  'freemium',
  'services',
  'other',
] as const;

export type BusinessModel = (typeof BUSINESS_MODELS)[number];

export const IDEA_STAGES = [
  'idea_only',
  'researching',
  'prototype',
  'launched',
] as const;

export type IdeaStage = (typeof IDEA_STAGES)[number];

export const INDUSTRIES = [
  'b2b_saas',
  'consumer_tech',
  'fintech',
  'healthtech',
  'edtech',
  'ecommerce',
  'ai_ml',
  'cleantech',
  'proptech',
  'creator_economy',
  'developer_tools',
  'supply_chain',
  'hardware',
  'media_entertainment',
  'other',
] as const;

export type Industry = (typeof INDUSTRIES)[number];

export const IDEA_STATUSES = ['draft', 'active', 'archived'] as const;

export type IdeaStatus = (typeof IDEA_STATUSES)[number];

const trimmedString = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} cannot exceed ${max} characters`);

export const ideaBaseSchema = z.object({
  title: trimmedString(3, 120, 'Title'),
  problem: trimmedString(20, 1000, 'Problem'),
  target_customer: trimmedString(10, 500, 'Target customer'),
  solution: trimmedString(20, 1500, 'Solution'),
  business_model: z.enum(BUSINESS_MODELS, {
    errorMap: () => ({ message: 'Please select a business model' }),
  }),
  business_model_note: z.string().trim().max(500, 'Note cannot exceed 500 characters').optional().nullable(),
  stage: z.enum(IDEA_STAGES, {
    errorMap: () => ({ message: 'Please select a stage' }),
  }),
  industry: z.enum(INDUSTRIES, {
    errorMap: () => ({ message: 'Please select an industry' }),
  }),
  industry_other: z.string().trim().max(100, 'Custom industry cannot exceed 100 characters').optional().nullable(),
  region: trimmedString(2, 80, 'Target region'),
  status: z.enum(['draft', 'active']).default('active'),
});

export const ideaFormSchema = ideaBaseSchema.superRefine((data, ctx) => {
  if (data.industry === 'other') {
    if (!data.industry_other || data.industry_other.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['industry_other'],
        message: 'Please specify your industry when choosing "Other"',
      });
    }
  }
});

export type IdeaFormInput = z.infer<typeof ideaFormSchema>;

export const createIdeaSchema = ideaFormSchema;
export type CreateIdeaInput = z.infer<typeof createIdeaSchema>;

export const updateIdeaSchema = ideaBaseSchema
  .partial()
  .extend({
    title: trimmedString(3, 120, 'Title'),
    problem: trimmedString(20, 1000, 'Problem'),
    target_customer: trimmedString(10, 500, 'Target customer'),
    solution: trimmedString(20, 1500, 'Solution'),
    business_model: z.enum(BUSINESS_MODELS),
    stage: z.enum(IDEA_STAGES),
    industry: z.enum(INDUSTRIES),
    region: trimmedString(2, 80, 'Target region'),
  })
  .superRefine((data, ctx) => {
    if (data.industry === 'other') {
      if (!data.industry_other || data.industry_other.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['industry_other'],
          message: 'Please specify your industry when choosing "Other"',
        });
      }
    }
  });
export type UpdateIdeaInput = z.infer<typeof updateIdeaSchema>;

export interface IdeaVersion {
  id: string;
  idea_id?: string;
  ideaId?: string;
  version_number?: number;
  versionNumber?: number;
  title: string;
  problem: string;
  target_customer?: string;
  targetCustomer?: string;
  solution: string;
  business_model?: BusinessModel;
  businessModel?: BusinessModel;
  business_model_note?: string | null;
  businessModelNote?: string | null;
  stage: IdeaStage;
  industry: Industry;
  industry_other?: string | null;
  industryOther?: string | null;
  region: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface Idea {
  id: string;
  user_id?: string;
  userId?: string;
  title: string;
  status: IdeaStatus;
  current_version_id?: string | null;
  currentVersionId?: string | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  current_version?: IdeaVersion | null;
  currentVersion?: IdeaVersion | null;
  versions?: IdeaVersion[];
}
