-- Migration: add voice_poke column to team_members
-- This column stores audio data as base64-encoded text for the voice poke feature.
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS voice_poke TEXT;
