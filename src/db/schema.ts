import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
export const events = pgTable('events', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  adminHash: text('admin_hash').notNull().unique(),
  name: text('name').notNull(),
  organizer: text('organizer').notNull(),
  description: text('description').notNull().default(''),
  type: text('type').notNull(),
  minValue: integer('min_value').notNull().default(0),
  maxValue: integer('max_value').notNull().default(0),
  exchangeAt: timestamp('exchange_at', { withTimezone: true }).notNull(),
  deadline: timestamp('deadline', { withTimezone: true }).notNull(),
  location: text('location').notNull().default(''),
  closed: boolean('closed').notNull().default(false),
  ended: boolean('ended').notNull().default(false),
  drawnAt: timestamp('drawn_at', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  version: integer('version').notNull().default(0),
  teamCount: integer('team_count').notNull().default(2),
  winnerCount: integer('winner_count').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const participants = pgTable(
  'participants',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    gifts: jsonb('gifts').$type<string[]>().notNull().default([]),
    notes: text('notes').notNull().default(''),
    wishes: text('wishes').notNull().default(''),
    nonce: text('nonce').notNull(),
    accessCodeHash: text('access_code_hash'),
    result: text('result'),
    viewedAt: timestamp('viewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('participant_event_email').on(t.eventId, t.email),
    uniqueIndex('participant_event_phone').on(t.eventId, t.phone),
    uniqueIndex('participant_event_access_code').on(t.eventId, t.accessCodeHash),
  ],
);
export const exclusions = pgTable(
  'exclusions',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    a: text('a')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
    b: text('b')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
  },
  (t) => [uniqueIndex('exclusion_pair').on(t.eventId, t.a, t.b)],
);
export const locks = pgTable('locks', { id: text('id').primaryKey() });
export const emailAttempts = pgTable('email_attempts', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  resetAt: timestamp('reset_at', { withTimezone: true }).notNull(),
});
export type Event = typeof events.$inferSelect;
export type Participant = typeof participants.$inferSelect;
