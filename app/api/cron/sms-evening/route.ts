import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { sendSms } from '@/lib/sms'
import { getTodayPST } from '@/lib/challenge'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://challenges.entropik.co'

/**
 * Sends the evening reminder SMS to all users who haven't checked in today.
 * Skipped automatically if the 50% milestone SMS was already sent today
 * (to avoid double-pinging the same day), unless `force` is true.
 */
async function runEveningReminders(force = false) {
  const supabase = createSupabaseServiceClient()
  const today = getTodayPST()

  // Check if the milestone SMS was already sent today
  const { data: milestoneSetting } = await supabase
    .from('challenge_settings')
    .select('value')
    .eq('key', 'sms_milestone_date')
    .maybeSingle()

  const milestoneSentToday = milestoneSetting?.value === today

  if (milestoneSentToday && !force) {
    return { skipped: true, reason: 'Milestone SMS already sent today — skipping evening reminder.' }
  }

  const [{ data: allProfiles }, { data: checkinsToday }] = await Promise.all([
    supabase.from('profiles').select('id, display_name, phone'),
    supabase.from('checkins').select('user_id').eq('date', today),
  ])

  const checkedInIds = new Set((checkinsToday ?? []).map((c: any) => c.user_id))
  const targets = (allProfiles ?? []).filter((u: any) => u.phone && !checkedInIds.has(u.id))

  const results = await Promise.allSettled(
    targets.map((u: any) =>
      sendSms(
        u.phone,
        `⏰ Hey ${u.display_name}! Day's almost over and you haven't planked yet. Last chance — do it now: ${APP_URL}\n\nReply STOP to opt out.`,
      )
    )
  )

  return {
    sent:   results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').length,
  }
}

/** GET — called by Vercel Cron at 6 pm PDT (01:00 UTC next day) daily */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runEveningReminders(false) // respect milestone flag
    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error('sms-evening cron error:', err)
    return NextResponse.json({ error: err?.message ?? 'Internal Server Error' }, { status: 500 })
  }
}

/** POST — called from admin panel for manual testing; `force: true` bypasses milestone check */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const force = (body as any).force ?? false
    const result = await runEveningReminders(force)
    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error('sms-evening manual trigger error:', err)
    return NextResponse.json({ error: err?.message ?? 'Internal Server Error' }, { status: 500 })
  }
}
