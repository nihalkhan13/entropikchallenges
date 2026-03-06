/**
 * lib/challenge.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for all challenge-related logic:
 *   - PST-safe date formatting
 *   - Day number calculation
 *   - Streak calculation (integer-based, no float comparison)
 *   - Challenge config loading from Supabase (with in-module cache)
 *
 * No UI imports. No "use client" directive. Pure functions only.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { DEFAULT_START_DATE, DEFAULT_DURATION_DAYS } from './constants'
import type { ChallengeConfig } from './types'

// ---------------------------------------------------------------------------
// Date utilities (PST-safe)
// ---------------------------------------------------------------------------

/**
 * Formats a Date object as 'YYYY-MM-DD' in America/Los_Angeles (PST/PDT).
 * Uses toLocaleString to avoid the UTC offset pitfall of toISOString().
 */
export function formatDatePST(date: Date): string {
  const pst = new Date(
    date.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
  )
  const year  = pst.getFullYear()
  const month = String(pst.getMonth() + 1).padStart(2, '0')
  const day   = String(pst.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Returns today's date string as 'YYYY-MM-DD' in PST/PDT.
 */
export function getTodayPST(): string {
  return formatDatePST(new Date())
}

/**
 * Adds (or subtracts) whole days from a 'YYYY-MM-DD' string.
 * Uses integer arithmetic — no float rounding issues.
 *
 * @example offsetDate('2026-01-31', 1)  → '2026-02-01'
 * @example offsetDate('2026-02-01', -1) → '2026-01-31'
 */
export function offsetDate(dateStr: string, days: number): string {
  // Parse as PST midnight to avoid DST edge cases
  const d = new Date(`${dateStr}T00:00:00-08:00`)
  d.setDate(d.getDate() + days)
  return formatDatePST(d)
}

/**
 * Calculates which challenge day a given date string falls on.
 * Day 1 = startDate, Day 2 = startDate + 1, etc.
 * Returns NaN for dates before startDate.
 *
 * @param date      'YYYY-MM-DD' string
 * @param startDate 'YYYY-MM-DD' string (challenge start)
 */
export function getDayNumber(date: string, startDate: string): number {
  // Parse both as PST midnight for stable integer diff
  const start  = new Date(`${startDate}T00:00:00-08:00`)
  const target = new Date(`${date}T00:00:00-08:00`)

  if (isNaN(target.getTime())) return NaN

  const diffMs   = target.getTime() - start.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))  // integer, safe

  if (diffDays < 0) return NaN
  return diffDays + 1  // Day 1-indexed
}

/**
 * Returns the current challenge day number based on today's PST date.
 */
export function getCurrentDay(startDate: string): number {
  return getDayNumber(getTodayPST(), startDate)
}

// ---------------------------------------------------------------------------
// Streak calculation (single canonical implementation)
// ---------------------------------------------------------------------------

/**
 * Calculates the current consecutive streak from a list of check-in dates.
 *
 * Rules:
 * - A streak is "active" if the user checked in today OR yesterday.
 * - Consecutive days are counted backwards from the most recent check-in.
 * - Uses PST dates and integer day offsets — no float comparison.
 *
 * @param checkinDates Array of 'YYYY-MM-DD' strings (any order)
 * @returns Current streak length (0 if no active streak)
 */
export function calculateCurrentStreak(checkinDates: string[]): number {
  if (!checkinDates.length) return 0

  const today     = getTodayPST()
  const yesterday = offsetDate(today, -1)

  // Sort descending (most recent first)
  const sorted = [...checkinDates].sort().reverse()

  // Streak must start from today or yesterday
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0

  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    if (offsetDate(sorted[i - 1], -1) === sorted[i]) {
      streak++
    } else {
      break
    }
  }
  return streak
}

/**
 * Calculates the longest streak in a history of check-in dates.
 * Used for the performance report.
 *
 * @param checkinDates Array of 'YYYY-MM-DD' strings (any order)
 */
export function calculateLongestStreak(checkinDates: string[]): number {
  if (!checkinDates.length) return 0

  const sorted = [...checkinDates].sort()
  let longest = 1
  let current = 1

  for (let i = 1; i < sorted.length; i++) {
    if (offsetDate(sorted[i - 1], 1) === sorted[i]) {
      current++
      longest = Math.max(longest, current)
    } else {
      current = 1
    }
  }
  return longest
}

// ---------------------------------------------------------------------------
// Challenge config loading (with in-module cache)
// ---------------------------------------------------------------------------

let _configCache: ChallengeConfig | null = null

/**
 * Loads challenge config from Supabase `challenge_settings` table.
 * Result is cached in-module so subsequent calls are free.
 *
 * Falls back to DEFAULT_START_DATE / DEFAULT_DURATION_DAYS if the
 * DB read fails (e.g., no env vars in local dev without DB).
 *
 * @param supabaseClient A Supabase browser or server client
 */
export async function getChallengeConfig(
  // Accept any object with .from() — avoids tight coupling to client type
  supabaseClient: { from: (table: string) => any }
): Promise<ChallengeConfig> {
  if (_configCache) return _configCache

  // TEST BRANCH: env var override lets Vercel preview deployments
  // use a different start date without touching the production DB.
  const envOverride = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_TEST_START_DATE || '')
    : (process.env.NEXT_PUBLIC_TEST_START_DATE || '')

  if (envOverride) {
    _configCache = {
      startDate:    envOverride,
      durationDays: DEFAULT_DURATION_DAYS,
    }
    return _configCache
  }

  try {
    const { data } = await supabaseClient
      .from('challenge_settings')
      .select('key, value')

    const map: Record<string, string> = {}
    if (data) {
      for (const row of data) {
        map[row.key] = row.value
      }
    }

    _configCache = {
      startDate:    map['start_date']    ?? DEFAULT_START_DATE,
      durationDays: Number(map['duration_days'] ?? DEFAULT_DURATION_DAYS),
    }
  } catch {
    _configCache = {
      startDate:    DEFAULT_START_DATE,
      durationDays: DEFAULT_DURATION_DAYS,
    }
  }

  return _configCache
}

/**
 * Invalidates the challenge config cache.
 * Call this after an admin updates start_date or duration_days.
 */
export function invalidateChallengeConfigCache(): void {
  _configCache = null
}

/**
 * Generates the array of 'YYYY-MM-DD' date strings for all challenge days.
 *
 * @param startDate   'YYYY-MM-DD'
 * @param durationDays number of days (default 100)
 */
export function getChallengeDays(
  startDate: string,
  durationDays: number = DEFAULT_DURATION_DAYS
): string[] {
  return Array.from({ length: durationDays }, (_, i) =>
    offsetDate(startDate, i)
  )
}
