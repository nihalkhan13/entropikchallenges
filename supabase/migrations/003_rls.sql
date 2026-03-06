-- =============================================================
-- Migration 003: Row Level Security Policies
-- Replaces the old wide-open "allow all" policies with
-- user-scoped policies using auth.uid().
-- =============================================================

-- ---------------------------------------------------------------
-- PROFILES
-- Public read (leaderboard, calendar grid); own-row writes.
-- ---------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------
-- CHECKINS
-- Public read (calendar grid, leaderboard); own-row insert/delete.
-- UPDATE is intentionally excluded — checkins are immutable.
-- Use delete + re-insert to "undo" via the UI.
-- ---------------------------------------------------------------
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkins_select_public"
  ON public.checkins FOR SELECT
  USING (true);

CREATE POLICY "checkins_insert_own"
  ON public.checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "checkins_delete_own"
  ON public.checkins FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- CHALLENGE SETTINGS
-- Public read; writes are service-role only (admin API route).
-- No client INSERT/UPDATE/DELETE policy = only service role can write.
-- ---------------------------------------------------------------
ALTER TABLE public.challenge_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select_public"
  ON public.challenge_settings FOR SELECT
  USING (true);

-- ---------------------------------------------------------------
-- ACTIVITIES
-- Public read; inserts happen only via SECURITY DEFINER triggers,
-- which run as postgres and bypass RLS. No client insert policy.
-- ---------------------------------------------------------------
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activities_select_public"
  ON public.activities FOR SELECT
  USING (true);

-- ---------------------------------------------------------------
-- REACTIONS
-- Public read; own-row insert/delete.
-- ---------------------------------------------------------------
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_select_public"
  ON public.reactions FOR SELECT
  USING (true);

CREATE POLICY "reactions_insert_own"
  ON public.reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reactions_delete_own"
  ON public.reactions FOR DELETE
  USING (auth.uid() = user_id);
