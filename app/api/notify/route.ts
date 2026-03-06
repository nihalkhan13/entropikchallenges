import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { sendPushNotification } from '@/lib/notifications'
import { getTodayPST } from '@/lib/challenge'

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
    const { type } = await request.json()
    // Use service client so we can query across all users (bypasses RLS)
    const supabase = createSupabaseServiceClient()
    const today = getTodayPST()

    if (type === 'social-pulse') {
      const [{ count: totalUsers }, { count: checkedInCount }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('checkins').select('*', { count: 'exact', head: true }).eq('date', today),
      ])

      if (!totalUsers || !checkedInCount) return NextResponse.json({ success: true })

      const percentage = Math.round((checkedInCount / totalUsers) * 100)

      if (percentage === 50 || percentage === 80) {
        // Fetch all profiles then filter out those who already checked in
        const [{ data: allProfiles }, { data: checkinsToday }] = await Promise.all([
          supabase.from('profiles').select('id, notification_settings'),
          supabase.from('checkins').select('user_id').eq('date', today),
        ])

        const checkedInIds = new Set((checkinsToday ?? []).map((c: any) => c.user_id))

        const tokenList = (allProfiles ?? [])
          .filter((u: any) =>
            !checkedInIds.has(u.id) &&
            u.notification_settings?.push_token &&
            u.notification_settings?.social !== false
          )
          .map((u: any) => u.notification_settings.push_token)

        if (tokenList.length > 0) {
          await sendPushNotification({
            userIds: tokenList,
            title: "Squad Pulse ⚡",
            message: `${percentage}% of your squad finished their plank. Don't be the outlier.`,
          })
        }
      }
    }

    if (type === 'daily-reminder') {
      const [{ data: allProfiles }, { data: checkinsToday }] = await Promise.all([
        supabase.from('profiles').select('id, notification_settings'),
        supabase.from('checkins').select('user_id').eq('date', today),
      ])

      const checkedInIds = new Set((checkinsToday ?? []).map((c: any) => c.user_id))

      const tokenList = (allProfiles ?? [])
        .filter((u: any) =>
          !checkedInIds.has(u.id) &&
          u.notification_settings?.push_token &&
          u.notification_settings?.reminders !== false
        )
        .map((u: any) => u.notification_settings.push_token)

      if (tokenList.length > 0) {
        await sendPushNotification({
          userIds: tokenList,
          title: "Status Check 👊",
          message: "The day is ending. Protect your streak.",
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notification API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
