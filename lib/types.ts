// =============================================================
// Shared TypeScript types for 100-Day Plank Challenge
// =============================================================

/**
 * Profile — mirrors the public.profiles table.
 * id is the Supabase Auth UUID (auth.users.id).
 */
export type Profile = {
  id: string
  display_name: string
  is_admin: boolean
  notification_settings?: {
    reminders: boolean
    social: boolean
    push_token?: string
  }
  timezone?: string
  created_at: string
}

/**
 * CheckIn — mirrors the public.checkins table.
 * duration_seconds is optional (plank length in seconds, 5–3600).
 */
export type CheckIn = {
  id: string
  user_id: string
  date: string            // 'YYYY-MM-DD'
  duration_seconds: number | null
  created_at: string
}

/**
 * Activity — Squad Pulse feed item.
 * profile is the joined profile row (via profiles foreign key).
 */
export type Activity = {
  id: string
  user_id: string
  event_type: 'completed' | 'missed' | 'streak_milestone' | 'finished'
  metadata: {
    day?: number
    date?: string
    streak_count?: number
    duration_seconds?: number | null
    total_days?: number
  }
  created_at: string
  profile?: Profile       // joined via select('*, profile:profiles(*)')
  reactions?: Reaction[]
}

/**
 * Reaction — emoji reaction on an activity.
 */
export type Reaction = {
  id: string
  activity_id: string
  user_id: string
  emoji: string
  created_at: string
  profile?: Profile
}

/**
 * Challenge config loaded from challenge_settings table.
 */
export type ChallengeConfig = {
  startDate: string       // 'YYYY-MM-DD'
  durationDays: number    // default 100
}
