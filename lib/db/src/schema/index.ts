import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  serial,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userMemberships = pgTable(
  'user_memberships',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    code: text('code').notNull(),
    memberId: text('member_id').notNull(),
    nickname: text('nickname').notNull(),
    token: text('token').notNull(),
  },
  (t) => [unique('user_memberships_user_id_code_key').on(t.userId, t.code)],
);

export const teams = pgTable(
  'teams',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('teams_code_key').on(t.code)],
);

export const teamMembers = pgTable('team_members', {
  id: text('id').primaryKey(),
  teamCode: text('team_code').notNull(),
  nickname: text('nickname').notNull(),
  status: text('status').notNull().default('idle'),
  ignoreLevel: integer('ignore_level').notNull().default(0),
  nowCount: integer('now_count').notNull().default(0),
  dismissedCount: integer('dismissed_count').notNull().default(0),
  lastSeen: text('last_seen').notNull().default(''),
  todayDate: text('today_date').notNull().default(''),
  avgReactionMs: integer('avg_reaction_ms').notNull().default(0),
  reactionCount: integer('reaction_count').notNull().default(0),
  avatarData: text('avatar_data').default(''),
  voicePoke: text('voice_poke').default(''),
});

export const memberTokens = pgTable('member_tokens', {
  token: text('token').primaryKey(),
  memberId: text('member_id').notNull(),
});

export const memberSessions = pgTable('member_sessions', {
  id: serial('id').primaryKey(),
  memberId: text('member_id').notNull(),
  date: text('date').notNull(),
  completedAt: bigint('completed_at', { mode: 'number' }).notNull(),
  type: text('type').notNull(),
});

export const memberReactions = pgTable('member_reactions', {
  id: serial('id').primaryKey(),
  memberId: text('member_id').notNull(),
  date: text('date').notNull(),
  reactionMs: integer('reaction_ms').notNull(),
  dismissed: boolean('dismissed').notNull(),
});

export const dailyCompliance = pgTable(
  'daily_compliance',
  {
    id: serial('id').primaryKey(),
    memberId: text('member_id').notNull(),
    date: text('date').notNull(),
    alerts: integer('alerts').notNull().default(0),
    dismissed: integer('dismissed').notNull().default(0),
  },
  (t) => [unique('daily_compliance_member_id_date_key').on(t.memberId, t.date)],
);
