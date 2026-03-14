import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { sendPushNotification } from '@/lib/notifications'
import { sendSMS }              from '@/lib/sms'
import { getTodayPST }          from '@/lib/challenge'

// Streak values that trigger a milestone notification
const STREAK_MILESTONES = [7, 14, 21, 30, 50, 100]

/**
 * Check how many notifications this user has received today.
 * Returns true if we can send (under cap of 3) and increments the counter.
 * Tracking is stored in profiles.notification_settings JSONB.
 */
async function canSendToUser(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  userId: string,
  today: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('notification_settings')
    .eq('id', userId)
    .single()

  const settings = (data?.notification_settings ?? {}) as Record<string, any>
  const isToday = settings.notif_date === today
  const count = isToday ? (settings.notif_count ?? 0) : 0

  if (count >= 3) return false

  // Increment count
  await supabase.from('profiles').update({
    notification_settings: {
      ...settings,
      notif_date: today,
      notif_count: count + 1,
    },
  }).eq('id', userId)

  return true
}

export async function POST(request: Request) {
  // Guard: require CRON_SECRET bearer token to prevent external abuse
  const authHeader = request.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { type, userId } = body as { type: string; userId?: string }
    const supabase = createSupabaseServiceClient()
    const today = getTodayPST()

    // ── Streak milestone notification ──────────────────────────────────────────
    // Called right after a successful check-in with the checking-in user's id.
    // Calculates their current streak and sends a push if it's a milestone.
    if (type === 'streak-milestone' && userId) {
      // Fetch all checkins for this user, newest first
      const { data: checkins } = await supabase
        .from('checkins')
        .select('date')
        .eq('user_id', userId)
        .order('date', { ascending: false })

      if (!checkins || checkins.length === 0) {
        return NextResponse.json({ success: true })
      }

      // Calculate current streak (consecutive days ending on today)
      const dates = checkins.map((c: any) => c.date as string)
      let streak = 0
      let expected = today
      for (const d of dates) {
        if (d === expected) {
          streak++
          // Move expected date back 1 day (PST-safe: use date string arithmetic)
          const prev = new Date(`${expected}T12:00:00-08:00`)
          prev.setDate(prev.getDate() - 1)
          expected = prev.toISOString().split('T')[0]
        } else {
          break
        }
      }

      // Only proceed if this is a milestone streak
      if (!STREAK_MILESTONES.includes(streak)) {
        return NextResponse.json({ success: true })
      }

      // Get the user's push token
      const { data: profile } = await supabase
        .from('profiles')
        .select('notification_settings')
        .eq('id', userId)
        .single()

      const pushToken = profile?.notification_settings?.push_token
      if (!pushToken) return NextResponse.json({ success: true })

      // Enforce daily cap (max 3 notifications per user per day)
      const canSend = await canSendToUser(supabase, userId, today)
      if (!canSend) return NextResponse.json({ success: true, capped: true })

      const messages: Record<number, string> = {
        7:   '7 days straight 🔥 A full week of planks. The hardest part is over.',
        14:  '14 day streak ⚡ Two weeks straight. You are built different.',
        21:  '21 day streak 💪 Three weeks. This is becoming who you are.',
        30:  '30 day streak 💯 One month of daily planks. Legendary.',
        50:  '50 day streak 🏆 Halfway there. Do not stop now.',
        100: '100 day streak 👑 Challenge complete. You did it.',
      }

      await sendPushNotification({
        userIds: [pushToken],
        title: `${streak} Day Streak 🔥`,
        message: messages[streak] ?? `${streak} days in a row. Keep going.`,
      })
    }

    // ── Social pulse (squad group achievement) ─────────────────────────────────
    // Called after each check-in. Notifies unchecked-in users at 50% and 80%.
    // SMS is sent at the 50% milestone only (most motivating threshold).
    if (type === 'social-pulse') {
      const [{ count: totalUsers }, { count: checkedInCount }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('checkins').select('*', { count: 'exact', head: true }).eq('date', today),
      ])

      if (!totalUsers || !checkedInCount) return NextResponse.json({ success: true })

      const percentage = Math.round((checkedInCount / totalUsers) * 100)

      // Only fire at exactly 50% or 80% milestones to avoid spamming
      if (percentage !== 50 && percentage !== 80) {
        return NextResponse.json({ success: true })
      }

      const [{ data: allProfiles }, { data: checkinsToday }] = await Promise.all([
        supabase.from('profiles').select('id, phone, notification_settings'),
        supabase.from('checkins').select('user_id').eq('date', today),
      ])

      const checkedInIds = new Set((checkinsToday ?? []).map((c: any) => c.user_id))

      // Users who have not checked in yet
      const targets = (allProfiles ?? []).filter((u: any) => !checkedInIds.has(u.id))

      await Promise.all(
        targets.map(async (u: any) => {
          // ── Push notification ──
          if (
            u.notification_settings?.push_token &&
            u.notification_settings?.social !== false
          ) {
            const canSend = await canSendToUser(supabase, u.id, today)
            if (canSend) {
              await sendPushNotification({
                userIds: [u.notification_settings.push_token],
                title: 'Squad Pulse ⚡',
                message: `${percentage}% of your squad already planked today. Do not be the outlier.`,
              })
            }
          }

          // ── SMS (50% threshold only — one nudge per milestone) ──
          if (u.phone && percentage === 50) {
            await sendSMS({
              to: u.phone,
              message: `💪 Half your squad already planked today! Don't fall behind — 2 minutes is all it takes.`,
            })
          }
        })
      )
    }

    // ── Daily reminder ─────────────────────────────────────────────────────────
    // Called by a scheduled cron job in the evening for users who have not yet checked in.
    // Sends both a push notification (if token exists) and an SMS (if phone exists).
    if (type === 'daily-reminder') {
      const [{ data: allProfiles }, { data: checkinsToday }] = await Promise.all([
        supabase.from('profiles').select('id, phone, notification_settings'),
        supabase.from('checkins').select('user_id').eq('date', today),
      ])

      const checkedInIds = new Set((checkinsToday ?? []).map((c: any) => c.user_id))

      // Users who have not checked in today
      const targets = (allProfiles ?? []).filter((u: any) => !checkedInIds.has(u.id))

      await Promise.all(
        targets.map(async (u: any) => {
          // ── Push notification ──
          if (
            u.notification_settings?.push_token &&
            u.notification_settings?.reminders !== false
          ) {
            const canSend = await canSendToUser(supabase, u.id, today)
            if (canSend) {
              await sendPushNotification({
                userIds: [u.notification_settings.push_token],
                title: 'Status Check 👊',
                message: 'The day is ending. Protect your streak.',
              })
            }
          }

          // ── SMS reminder ──
          if (u.phone) {
            await sendSMS({
              to: u.phone,
              message: `⏰ Reminder: you haven't logged your plank yet today. 2 minutes — that's all it takes. Keep your streak alive.`,
            })
          }
        })
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notification API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
