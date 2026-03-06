// =============================================================
// App-wide constants — single source of truth for magic strings
// =============================================================

/** Activity event types (matches DB CHECK constraint) */
export const EVENT_TYPES = {
  COMPLETED:        'completed',
  MISSED:           'missed',
  STREAK_MILESTONE: 'streak_milestone',
  FINISHED:         'finished',
} as const

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES]

/** Available emoji reactions in the Squad Pulse feed */
export const EMOJIS = ['🔥', '💪', '⚡', '👀', '💯', '👊'] as const

/** All copy strings for the 30-Day Plank Challenge */
export const CHALLENGE_COPY = {
  CTA_BUTTON:         'I DID MY 2 MIN PLANK',
  CTA_CONFIRM:        'TAP TO CONFIRM',
  COMPLETE_LABEL:     'COMPLETE',
  APP_TITLE:          '30 Day 2 Min Plank Challenge',
  APP_TAGLINE:        '30 Days of Discipline. Stay Hard.',
  FOOTER_QUOTE:       'The floor is your altar. Show up every day.',
  SQUAD_PULSE_HEADER: 'Squad Pulse',
} as const

/** Default challenge configuration (fallback if DB read fails) */
// TEST BRANCH: override to today so countdown is skipped and check-ins work
export const DEFAULT_START_DATE    = '2026-03-06'
export const DEFAULT_DURATION_DAYS = 30
