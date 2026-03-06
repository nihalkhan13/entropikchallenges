
-- Seed data for Entropik 100 Squats Challenge
-- Run this in your Supabase SQL Editor to populate the database with the "Real" users.

-- 1. Clean up existing data (Optional - Use carefully!)
-- TRUNCATE TABLE public.checkins CASCADE;
-- TRUNCATE TABLE public.users CASCADE;
-- TRUNCATE TABLE public.challenge_settings CASCADE;

-- 2. Insert Settings
INSERT INTO public.challenge_settings (key, value)
VALUES ('start_date', '2026-01-31')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. Insert Users
INSERT INTO public.users (id, username, is_admin, created_at) VALUES
  (uuid_generate_v4(), 'Nihal', true, '2026-01-31 10:00:00+00'),
  (uuid_generate_v4(), 'Nick', false, '2026-01-31 10:00:00+00'),
  (uuid_generate_v4(), 'Eddie', false, '2026-01-31 10:00:00+00'),
  (uuid_generate_v4(), 'Jordan', false, '2026-01-31 10:00:00+00')
ON CONFLICT (username) DO NOTHING;

-- 4. Insert Checkins (We need to look up IDs since UUIDs are generated)
-- Note: This block uses a DO block to find the user IDs safely.

DO $$
DECLARE
  u_nihal uuid;
  u_nick uuid;
  u_eddie uuid;
  u_jordan uuid;
BEGIN
  SELECT id INTO u_nihal FROM public.users WHERE username = 'Nihal';
  SELECT id INTO u_nick FROM public.users WHERE username = 'Nick';
  SELECT id INTO u_eddie FROM public.users WHERE username = 'Eddie';
  SELECT id INTO u_jordan FROM public.users WHERE username = 'Jordan';

  -- Nihal (3/3)
  INSERT INTO public.checkins (user_id, date) VALUES (u_nihal, '2026-01-31') ON CONFLICT DO NOTHING;
  INSERT INTO public.checkins (user_id, date) VALUES (u_nihal, '2026-02-01') ON CONFLICT DO NOTHING;
  INSERT INTO public.checkins (user_id, date) VALUES (u_nihal, '2026-02-02') ON CONFLICT DO NOTHING;

  -- Nick (2/3)
  INSERT INTO public.checkins (user_id, date) VALUES (u_nick, '2026-01-31') ON CONFLICT DO NOTHING;
  INSERT INTO public.checkins (user_id, date) VALUES (u_nick, '2026-02-01') ON CONFLICT DO NOTHING;

  -- Eddie (2/3 - Completed Day 2, Missed Day 3)
  INSERT INTO public.checkins (user_id, date) VALUES (u_eddie, '2026-01-31') ON CONFLICT DO NOTHING;
  INSERT INTO public.checkins (user_id, date) VALUES (u_eddie, '2026-02-01') ON CONFLICT DO NOTHING;

  -- Jordan (1/3)
  INSERT INTO public.checkins (user_id, date) VALUES (u_jordan, '2026-01-31') ON CONFLICT DO NOTHING;

END $$;
