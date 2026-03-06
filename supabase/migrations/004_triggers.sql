-- =============================================================
-- Migration 004: Database Triggers
-- All functions use SECURITY DEFINER so they run with elevated
-- privileges (bypassing RLS) and can insert into activities.
-- =============================================================

-- ---------------------------------------------------------------
-- TRIGGER 1: Auto-create profile row on first Google sign-in
-- Fires AFTER INSERT on auth.users (managed by Supabase Auth).
-- Extracts display_name from Google's raw_user_meta_data.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO UPDATE
    SET display_name = EXCLUDED.display_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ---------------------------------------------------------------
-- TRIGGER 2: Auto-log 'completed' activity when checkin is inserted
-- This is the core of Squad Pulse — every check-in appears in feed.
-- Includes duration_seconds in metadata if provided.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_checkin_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activities (user_id, event_type, metadata)
  VALUES (
    NEW.user_id,
    'completed',
    jsonb_build_object(
      'date',             NEW.date,
      'duration_seconds', NEW.duration_seconds
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_log_checkin
  AFTER INSERT ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.log_checkin_activity();


-- ---------------------------------------------------------------
-- TRIGGER 3: Auto-log 'streak_milestone' at 7, 14, 30, 50, 100 days
-- Runs after each checkin insert; calculates consecutive streak
-- using window function grouping (no float math).
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_streak_milestone()
RETURNS TRIGGER AS $$
DECLARE
  streak_count INT;
BEGIN
  -- Calculate current consecutive streak using gap-group method
  SELECT COUNT(*) INTO streak_count
  FROM (
    SELECT
      date,
      date - (ROW_NUMBER() OVER (ORDER BY date))::INTEGER AS grp
    FROM public.checkins
    WHERE user_id = NEW.user_id
  ) t
  WHERE grp = (
    SELECT date - (ROW_NUMBER() OVER (ORDER BY date))::INTEGER
    FROM public.checkins
    WHERE user_id = NEW.user_id
    ORDER BY date DESC
    LIMIT 1
  );

  IF streak_count IN (7, 14, 30, 50, 100) THEN
    INSERT INTO public.activities (user_id, event_type, metadata)
    VALUES (
      NEW.user_id,
      'streak_milestone',
      jsonb_build_object('streak_count', streak_count)
    )
    -- Prevent duplicate milestone entries for same streak value
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_streak_milestone
  AFTER INSERT ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.check_streak_milestone();


-- ---------------------------------------------------------------
-- TRIGGER 4: Auto-log 'finished' when user completes all 100 days
-- Reads duration_days from challenge_settings so it's dynamic.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_challenge_completion()
RETURNS TRIGGER AS $$
DECLARE
  total_days        INT;
  user_checkin_count INT;
BEGIN
  SELECT value::INT INTO total_days
  FROM public.challenge_settings
  WHERE key = 'duration_days';

  SELECT COUNT(*) INTO user_checkin_count
  FROM public.checkins
  WHERE user_id = NEW.user_id;

  IF user_checkin_count >= total_days THEN
    INSERT INTO public.activities (user_id, event_type, metadata)
    VALUES (
      NEW.user_id,
      'finished',
      jsonb_build_object('total_days', total_days)
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_check_completion
  AFTER INSERT ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.check_challenge_completion();


-- ---------------------------------------------------------------
-- VIEW: today_squad_stats (Squad Pulse improvement)
-- Single query replaces two separate COUNT queries in GroupProgress.
-- NOTE: CURRENT_DATE uses server timezone (UTC). The API layer or
-- component must pass today's PST date when accuracy matters.
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW public.today_squad_stats AS
SELECT
  (SELECT COUNT(*) FROM public.profiles)                              AS total_users,
  (SELECT COUNT(*) FROM public.checkins WHERE date = CURRENT_DATE)    AS checked_in_today;
