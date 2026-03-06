-- Engagement Features Migration
-- Run this in Supabase SQL Editor

-- 1. Activities Table (Social Feed)
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'completed', 'missed', 'streak_milestone', 'finished'
  metadata JSONB DEFAULT '{}', -- { day, streak_count, etc. }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Reactions Table (Emoji Reactions)
CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(activity_id, user_id, emoji)
);

-- 3. Notification Settings (Extend Users or separate table)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"reminders": true, "social": true}';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Los_Angeles';

-- 4. Enable Realtime for Feed
-- Note: You might need to check if these tables are already in the publication
-- ALTER PUBLICATION supabase_realtime ADD TABLE activities;
-- ALTER PUBLICATION supabase_realtime ADD TABLE reactions;

-- 5. RLS Policies
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read activities" ON public.activities FOR SELECT USING (true);
CREATE POLICY "Allow public insert activities" ON public.activities FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read reactions" ON public.reactions FOR SELECT USING (true);
CREATE POLICY "Allow public all reactions" ON public.reactions FOR ALL USING (true) WITH CHECK (true);

-- 6. Trigger to auto-log 'completed' activity
CREATE OR REPLACE FUNCTION log_checkin_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activities (user_id, event_type, metadata)
  VALUES (NEW.user_id, 'completed', jsonb_build_object('date', NEW.date));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_log_checkin ON public.checkins;
CREATE TRIGGER tr_log_checkin
AFTER INSERT ON public.checkins
FOR EACH ROW
EXECUTE FUNCTION log_checkin_activity();
