import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { sendSms } from '@/lib/sms'
import { getTodayPST, calculateCurrentStreak } from '@/lib/challenge'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://challenges.entropik.co'

async function runStreakReminders() {
  const supabase = createSupabaseServiceClient()
  const today = getTodayPST()

  // Fetch all profiles and all check-in history in parallel
  const [{ data: allProfiles }, { data: allCheckins }] = await Promise.all([
    supabase.from('profiles').select('id, display_name, phone'),
    supabase.from('checkins').select('user_id, date'),
  ])

  const checkedInTodayIds = new Set(
    (allCheckins ?? []).filter((c: any) => c.date === today).map((c: any) => c.user_id)
  )

  // Build full checkin history per user (for streak calculation)
  const historyByUser: Record<string, string[]> = {}
  for (const c of (allCheckins ?? [])) {
    if (!historyByUser[c.user_id]) historyByUser[c.user_id] = []
    historyByUser[c.user_id].push(c.date)
  }

  // Find users: has phone + hasn't checked in today + active streak >= 2
  const targets = (allProfiles ?? [])
    .filter((u: any) => u.phone && !checkedInTodayIds.has(u.id))
    .map((u: any) => ({
      ...u,
      streak: calculateCurrentStreak(historyByUser[u.id] ?? []),
    }))
    .filter((u: any) => u.streak >= 2)

  const results = await Promise.allSettled(
    targets.map((u: any) =>
      sendSms(
        u.phone,
        `🔥 Hey ${u.display_name}! Your ${u.streak}-day streak is on the line. Log your 2-min plank before midnight or lose it: ${APP_URL}\n\nReply STOP to opt out.`,
      )
    )
  )

  return {
    sent:    results.filter((r) => r.status === 'fulfilled').length,
    failed:  results.filter((r) => r.status === 'rejected').length,
    targets: targets.length,
  }
}

/** GET — called by Vercel Cron at 10 am PDT (17:00 UTC) daily */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runStreakReminders()
    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error('sms-streak cron error:', err)
    return NextResponse.json({ error: err?.message ?? 'Internal Server Error' }, { status: 500 })
  }
}

/** POST — called from admin panel for manual testing (no auth, already admin-gated on client) */
export async function POST() {
  try {
    const result = await runStreakReminders()
    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error('sms-streak manual trigger error:', err)
    return NextResponse.json({ error: err?.message ?? 'Internal Server Error' }, { status: 500 })
  }
}
