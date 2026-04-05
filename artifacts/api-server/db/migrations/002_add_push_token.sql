-- Migration: add push_token column to team_members for Expo push notifications
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS push_token TEXT DEFAULT '';
