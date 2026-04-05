-- Initial schema: all tables needed for NOW! Timer
-- This migration is idempotent (IF NOT EXISTS on all statements).

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_memberships (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  code TEXT NOT NULL,
  member_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  token TEXT NOT NULL,
  UNIQUE (user_id, code)
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (code)
);

-- Migration: add name column if missing (for existing DBs)
ALTER TABLE teams ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  team_code TEXT NOT NULL,
  nickname TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle',
  ignore_level INTEGER NOT NULL DEFAULT 0,
  now_count INTEGER NOT NULL DEFAULT 0,
  dismissed_count INTEGER NOT NULL DEFAULT 0,
  last_seen TEXT NOT NULL DEFAULT '',
  today_date TEXT NOT NULL DEFAULT '',
  avg_reaction_ms INTEGER NOT NULL DEFAULT 0,
  reaction_count INTEGER NOT NULL DEFAULT 0,
  avatar_data TEXT DEFAULT '',
  voice_poke TEXT DEFAULT '',
  push_token TEXT DEFAULT '',
  poke_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS member_tokens (
  token TEXT PRIMARY KEY,
  member_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS member_sessions (
  id SERIAL PRIMARY KEY,
  member_id TEXT NOT NULL,
  date TEXT NOT NULL,
  completed_at BIGINT NOT NULL,
  type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS member_reactions (
  id SERIAL PRIMARY KEY,
  member_id TEXT NOT NULL,
  date TEXT NOT NULL,
  reaction_ms INTEGER NOT NULL,
  dismissed BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_compliance (
  id SERIAL PRIMARY KEY,
  member_id TEXT NOT NULL,
  date TEXT NOT NULL,
  alerts INTEGER NOT NULL DEFAULT 0,
  dismissed INTEGER NOT NULL DEFAULT 0,
  UNIQUE (member_id, date)
);
