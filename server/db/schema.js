import { pgTable, uuid, text, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: varchar('clerk_id', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 100 }).notNull(),
  avatarUrl: text('avatar_url'),
  wins: integer('wins').default(0).notNull(),
  losses: integer('losses').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const cases = pgTable('cases', {
  id: uuid('id').defaultRandom().primaryKey(),
  plaintiffId: uuid('plaintiff_id').references(() => users.id).notNull(),
  defendantId: uuid('defendant_id').references(() => users.id),
  inviteCode: varchar('invite_code', { length: 20 }).unique(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  requestedCompensation: text('requested_compensation').notNull(),
  judgePersona: varchar('judge_persona', { length: 50 }).default('strict').notNull(),
  status: varchar('status', { length: 50 }).default('pending_defendant').notNull(),
  verdictText: text('verdict_text'),
  verdictWinner: varchar('verdict_winner', { length: 20 }),
  finalCompensation: text('final_compensation'),
  dramaScore: integer('drama_score'),
  notableQuote: text('notable_quote'),
  appealedFromId: uuid('appealed_from_id'),
  isAppeal: boolean('is_appeal').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
});

// Legacy turn-based arguments (kept for old cases)
export const arguments_ = pgTable('arguments', {
  id: uuid('id').defaultRandom().primaryKey(),
  caseId: uuid('case_id').references(() => cases.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  side: varchar('side', { length: 20 }).notNull(),
  roundNumber: integer('round_number').notNull(),
  content: text('content').notNull(),
  isObjection: boolean('is_objection').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Real-time courtroom messages
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  caseId: uuid('case_id').references(() => cases.id).notNull(),
  userId: uuid('user_id').references(() => users.id),
  sender: varchar('sender', { length: 20 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  content: text('content').notNull(),
  metadata: text('metadata'),
  attachmentUrl: text('attachment_url'),
  attachmentType: varchar('attachment_type', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
