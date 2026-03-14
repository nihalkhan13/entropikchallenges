import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { sendPushNotification } from '@/lib/notifications'
import { sendAdminEmail, emailWrap, emailH2, emailMeta } from '@/lib/email'
import { getTodayPST } from '@/lib/challenge'

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
        supabase.from('profiles').select('id, notification_settings'),
        supabase.from('checkins').select('user_id').eq('date', today),
      ])

      const checkedInIds = new Set((checkinsToday ?? []).map((c: any) => c.user_id))

      // Target users who have not checked in yet and have social notifications on
      const targets = (allProfiles ?? []).filter((u: any) =>
        !checkedInIds.has(u.id) &&
        u.notification_settings?.push_token &&
        u.notification_settings?.social !== false
      )

      // Send individually to enforce the per-user daily cap
      await Promise.all(
        targets.map(async (u: any) => {
          const canSend = await canSendToUser(supabase, u.id, today)
          if (!canSend) return
          await sendPushNotification({
            userIds: [u.notification_settings.push_token],
            title: 'Squad Pulse ⚡',
            message: `${percentage}% of your squad already planked today. Do not be the outlier.`,
          })
        })
      )

      // Notify admin at 50% milestone only
      if (percentage === 50) {
        sendAdminEmail({
          subject: `⚡ Squad Milestone: 50% completed today (${today})`,
          html: emailWrap(`
            ${emailH2('Squad Milestone: 50% ⚡')}
            ${emailMeta(today)}
            <p style="color:#e6edf3;">
              Half the squad has checked in today.
              <strong style="color:#5dffdd;">${checkedInCount} / ${totalUsers}</strong> members done.
            </p>
          `),
        }).catch(() => {/* non-critical */})
      }
    }

    // ── Daily reminder ─────────────────────────────────────────────────────────
    // Called by a scheduled cron job in the evening for users who have not yet checked in.
    if (type === 'daily-reminder') {
      const [{ data: allProfiles }, { data: checkinsToday }] = await Promise.all([
        supabase.from('profiles').select('id, notification_settings'),
        supabase.from('checkins').select('user_id').eq('date', today),
      ])

      const checkedInIds = new Set((checkinsToday ?? []).map((c: any) => c.user_id))

      const targets = (allProfiles ?? []).filter((u: any) =>
        !checkedInIds.has(u.id) &&
        u.notification_settings?.push_token &&
        u.notification_settings?.reminders !== false
      )

      await Promise.all(
        targets.map(async (u: any) => {
          const canSend = await canSendToUser(supabase, u.id, today)
          if (!canSend) return
          await sendPushNotification({
            userIds: [u.notification_settings.push_token],
            title: 'Status Check 👊',
            message: 'The day is ending. Protect your streak.',
          })
        })
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notification API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
