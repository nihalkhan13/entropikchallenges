-- =============================================================
-- Migration 001: Core Schema for 100-Day Plank Challenge
-- Replaces the old users table with profiles (Supabase Auth)
-- Adds duration_seconds to checkins
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------
-- PROFILES (replaces old users table)
-- id references auth.users so Supabase Auth manages identity
-- ---------------------------------------------------------------
CREATE TABLE public.profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name          TEXT NOT NULL,
  is_admin              BOOLEAN DEFAULT false,
  notification_settings JSONB DEFAULT '{"reminders": true, "social": true}',
  timezone              TEXT DEFAULT 'America/Los_Angeles',
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------
-- CHECKINS — one row per user per day
-- duration_seconds is optional; 5–3600 second range (0 = no plank)
-- ---------------------------------------------------------------
CREATE TABLE public.checkins (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date             DATE NOT NULL,
  duration_seconds INTEGER CHECK (
    duration_seconds IS NULL
    OR (duration_seconds >= 5 AND duration_seconds <= 3600)
  ),
  created_at       TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT checkins_user_date_unique UNIQUE(user_id, date)
);

-- ---------------------------------------------------------------
-- CHALLENGE SETTINGS — admin-configurable key/value store
-- ---------------------------------------------------------------
CREATE TABLE public.challenge_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Default: 100-day challenge starting Jan 31 2026
INSERT INTO public.challenge_settings (key, value) VALUES
  ('start_date',    '2026-01-31'),
  ('duration_days', '100')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------
-- ACTIVITIES — Squad Pulse feed (auto-populated by triggers)
-- ---------------------------------------------------------------
CREATE TABLE public.activities (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('completed', 'missed', 'streak_milestone', 'finished')
  ),
  metadata   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------
-- REACTIONS — emoji reactions on activity feed items
-- ---------------------------------------------------------------
CREATE TABLE public.reactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(activity_id, user_id, emoji)
);
