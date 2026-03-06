-- =============================================================
-- Migration 002: Performance Indexes
-- =============================================================

-- Checkin lookups by user+date (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_checkins_user_date
  ON public.checkins(user_id, date);

-- Checkin count for today across all users (GroupProgress, notify)
CREATE INDEX IF NOT EXISTS idx_checkins_date
  ON public.checkins(date);

-- Activity feed ordered by recency
CREATE INDEX IF NOT EXISTS idx_activities_created
  ON public.activities(created_at DESC);

-- Activities per user (streak trigger, completion check)
CREATE INDEX IF NOT EXISTS idx_activities_user_id
  ON public.activities(user_id);

-- Reactions per activity (aggregation in ReactionsList)
CREATE INDEX IF NOT EXISTS idx_reactions_activity
  ON public.reactions(activity_id);
