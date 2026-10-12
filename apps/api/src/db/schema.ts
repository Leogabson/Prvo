import {
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Smoke-test table verifying database connection and migration execution.
 */
export const migrationsCheck = pgTable('_migrations_check', {
  id: serial('id').primaryKey(),
  migrationName: text('migration_name').notNull(),
  appliedAt: timestamp('applied_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Users table
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash'),
    name: text('name'),
    avatarUrl: text('avatar_url'),
    googleId: text('google_id').unique(),
    role: text('role', { enum: ['user', 'admin'] }).default('user').notNull(),
    plan: text('plan').default('free').notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('users_email_idx').on(table.email),
    uniqueIndex('users_google_id_idx').on(table.googleId),
  ]
);

/**
 * Refresh tokens table with token families and rotation tracking
 */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    replacedById: uuid('replaced_by_id'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('refresh_tokens_user_id_idx').on(table.userId),
    index('refresh_tokens_family_id_idx').on(table.familyId),
    index('refresh_tokens_token_hash_idx').on(table.tokenHash),
  ]
);

/**
 * Password reset tokens table
 */
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('password_reset_tokens_user_id_idx').on(table.userId),
    index('password_reset_tokens_token_hash_idx').on(table.tokenHash),
  ]
);

/**
 * Plan limits table
 */
export const planLimits = pgTable(
  'plan_limits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    plan: text('plan').notNull(),
    key: text('key').notNull(),
    value: integer('value').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('plan_limits_plan_key_idx').on(table.plan, table.key),
  ]
);

/**
 * Ideas table
 */
export const ideas = pgTable(
  'ideas',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    status: text('status', { enum: ['draft', 'active', 'archived'] })
      .default('draft')
      .notNull(),
    currentVersionId: uuid('current_version_id'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('ideas_user_id_idx').on(table.userId),
    index('ideas_status_idx').on(table.status),
    index('ideas_current_version_idx').on(table.currentVersionId),
  ]
);

/**
 * Idea versions table preserving historical iterations
 */
export const ideaVersions = pgTable(
  'idea_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ideaId: uuid('idea_id')
      .notNull()
      .references(() => ideas.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    title: text('title').notNull(),
    problem: text('problem').notNull(),
    targetCustomer: text('target_customer').notNull(),
    solution: text('solution').notNull(),
    businessModel: text('business_model', {
      enum: [
        'subscription',
        'marketplace',
        'advertising',
        'one_time_sale',
        'freemium',
        'services',
        'other',
      ],
    }).notNull(),
    businessModelNote: text('business_model_note'),
    stage: text('stage', {
      enum: ['idea_only', 'researching', 'prototype', 'launched'],
    }).notNull(),
    industry: text('industry', {
      enum: [
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
      ],
    }).notNull(),
    industryOther: text('industry_other'),
    region: text('region').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idea_versions_idea_id_idx').on(table.ideaId),
    uniqueIndex('idea_versions_idea_version_idx').on(table.ideaId, table.versionNumber),
  ]
);

// Drizzle relations
export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  passwordResetTokens: many(passwordResetTokens),
  ideas: many(ideas),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export const ideasRelations = relations(ideas, ({ one, many }) => ({
  user: one(users, {
    fields: [ideas.userId],
    references: [users.id],
  }),
  currentVersion: one(ideaVersions, {
    fields: [ideas.currentVersionId],
    references: [ideaVersions.id],
  }),
  versions: many(ideaVersions),
}));

export const ideaVersionsRelations = relations(ideaVersions, ({ one }) => ({
  idea: one(ideas, {
    fields: [ideaVersions.ideaId],
    references: [ideas.id],
  }),
}));
