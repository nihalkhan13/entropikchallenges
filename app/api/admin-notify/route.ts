import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { sendAdminEmail, emailWrap, emailH2, emailMeta, emailRow } from '@/lib/email'
import { getTodayPST, offsetDate } from '@/lib/challenge'
import { DEFAULT_START_DATE, DEFAULT_DURATION_DAYS } from '@/lib/constants'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type } = body as { type: string }

    // ── New member joined ──────────────────────────────────────────────────────
    // Fired client-side from AuthContext after a new profile row is created.
    if (type === 'new-user') {
      const { displayName, email } = body as { displayName: string; email?: string }
      const time = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })

      await sendAdminEmail({
        subject: `🆕 New member joined: ${displayName}`,
        html: emailWrap(`
          ${emailH2('New Member Joined')}
          ${emailMeta(time + ' PST')}
          ${emailRow('Name', displayName)}
          ${emailRow('Email', email ?? '—')}
        `),
      })

      return NextResponse.json({ success: true })
    }

    // ── Phone number added / updated ───────────────────────────────────────────
    // Fired client-side from PhoneModal or EditProfileModal after a phone save.
    if (type === 'phone-added') {
      const { displayName, phone } = body as { displayName: string; phone: string }
      const time = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })

      await sendAdminEmail({
        subject: `📱 Phone added: ${displayName}`,
        html: emailWrap(`
          ${emailH2('Phone Number Registered')}
          ${emailMeta(time + ' PST')}
          ${emailRow('Name', displayName)}
          ${emailRow('Phone', phone)}
        `),
      })

      return NextResponse.json({ success: true })
    }

    // ── Daily summary (cron at 7 pm PST) ──────────────────────────────────────
    // Requires CRON_SECRET bearer token.
    if (type === 'daily-summary') {
      const authHeader = request.headers.get('authorization')
      if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
      ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const supabase = createSupabaseServiceClient()
      const today    = getTodayPST()

      const [{ data: allProfiles }, { data: checkinsToday }] = await Promise.all([
        supabase.from('profiles').select('id, display_name, phone'),
        supabase.from('checkins').select('user_id').eq('date', today),
      ])

      const checkedInIds  = new Set((checkinsToday ?? []).map((c: any) => c.user_id))
      const total         = (allProfiles ?? []).length
      const checkedIn     = checkedInIds.size
      const nonCompleters = (allProfiles ?? []).filter((u: any) => !checkedInIds.has(u.id))
      const pct           = total > 0 ? Math.round((checkedIn / total) * 100) : 0

      const tableRows = nonCompleters.map((u: any) => `
        <tr>
          <td style="padding:8px 14px;border-bottom:1px solid #21262d;color:#e6edf3;">${u.display_name}</td>
          <td style="padding:8px 14px;border-bottom:1px solid #21262d;color:${u.phone ? '#5dffdd' : '#6e7681'};">${u.phone ?? '—'}</td>
        </tr>
      `).join('')

      await sendAdminEmail({
        subject: `📋 Daily Plank Summary — ${today} (${pct}% done)`,
        html: emailWrap(`
          ${emailH2('Daily Plank Summary')}
          ${emailMeta(today)}
          <p style="margin:0 0 20px;">
            <strong style="color:#5dffdd;font-size:22px;">${checkedIn}</strong>
            <span style="color:#6e7681;"> / ${total} members completed today (${pct}%)</span>
          </p>
          ${nonCompleters.length === 0
            ? '<p style="color:#5dffdd;">✅ Everyone has checked in!</p>'
            : `
              <p style="color:#6e7681;font-size:13px;margin:0 0 8px;">
                Still waiting on ${nonCompleters.length} member${nonCompleters.length !== 1 ? 's' : ''}:
              </p>
              <table style="border-collapse:collapse;width:100%;background:#161b22;border-radius:8px;overflow:hidden;">
                <thead>
                  <tr style="background:#1c2128;">
                    <th style="padding:8px 14px;text-align:left;color:#5dffdd;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Name</th>
                    <th style="padding:8px 14px;text-align:left;color:#5dffdd;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Phone</th>
                  </tr>
                </thead>
                <tbody>${tableRows}</tbody>
              </table>
            `
          }
        `),
      })

      return NextResponse.json({ success: true })
    }

    // ── Full stats report (triggered from admin panel) ────────────────────────
    // No CRON_SECRET required — admin panel is already auth-gated.
    if (type === 'full-report') {
      const supabase  = createSupabaseServiceClient()
      const today     = getTodayPST()
      // asOfDate lets the admin pull a report for any past day; defaults to today
      const asOfDate  = (body as any).asOfDate ?? today

      // Fetch everything in parallel
      const [{ data: profiles }, { data: allCheckins }, { data: settings }] = await Promise.all([
        supabase.from('profiles').select('id, display_name, phone, created_at').order('created_at'),
        supabase.from('checkins').select('user_id, date'),
        supabase.from('challenge_settings').select('key, value'),
      ])

      // Parse challenge settings (fall back to constants if not configured)
      const settingsMap: Record<string, string> = {}
      for (const s of (settings ?? [])) settingsMap[s.key] = s.value
      const startDate    = settingsMap['start_date']    ?? DEFAULT_START_DATE
      const durationDays = parseInt(settingsMap['duration_days'] ?? String(DEFAULT_DURATION_DAYS))

      // How many days of the challenge had elapsed by asOfDate (capped at duration)
      const msPerDay    = 1000 * 60 * 60 * 24
      const startMs     = new Date(`${startDate}T00:00:00-08:00`).getTime()
      const asOfMs      = new Date(`${asOfDate}T00:00:00-08:00`).getTime()
      const daysElapsed = Math.max(1, Math.min(Math.floor((asOfMs - startMs) / msPerDay) + 1, durationDays))

      // Group check-in dates by user — only those on or before asOfDate
      const checkinsByUser: Record<string, string[]> = {}
      for (const c of (allCheckins ?? [])) {
        if (c.date > asOfDate) continue
        if (!checkinsByUser[c.user_id]) checkinsByUser[c.user_id] = []
        checkinsByUser[c.user_id].push(c.date)
      }
      for (const uid in checkinsByUser) {
        checkinsByUser[uid].sort().reverse()
      }

      // Per-user stats
      type UserStat = { name: string; phone: string | null; joined: string; totalCheckins: number; streak: number; completionPct: number }
      const userStats: UserStat[] = (profiles ?? []).map((u: any) => {
        const dates        = checkinsByUser[u.id] ?? []
        const totalCheckins = dates.length

        // Streak: consecutive days ending on asOfDate.
        // If the user hasn't checked in on asOfDate yet (day not over),
        // start counting from yesterday so an active streak isn't zeroed out.
        let streak   = 0
        let expected = dates.includes(asOfDate) ? asOfDate : offsetDate(asOfDate, -1)
        for (const d of dates) {
          if (d === expected) {
            streak++
            expected = offsetDate(expected, -1)
          } else if (d < expected) {
            break
          }
        }

        const completionPct = Math.round((totalCheckins / daysElapsed) * 100)
        const joined = new Date(u.created_at).toLocaleDateString('en-US', {
          timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric',
        })

        return { name: u.display_name, phone: u.phone ?? null, joined, totalCheckins, streak, completionPct }
      })

      // Sort leaderboard by total check-ins desc
      userStats.sort((a, b) => b.totalCheckins - a.totalCheckins)

      // Top-level stats (all scoped to asOfDate)
      const totalMembers         = userStats.length
      const membersWithPhone     = userStats.filter(u => u.phone).length
      const asOfDateCheckins     = (allCheckins ?? []).filter((c: any) => c.date === asOfDate).length
      const totalCheckinsAllTime = (allCheckins ?? []).filter((c: any) => c.date <= asOfDate).length
      const overallPct           = Math.round((totalCheckinsAllTime / Math.max(1, totalMembers * daysElapsed)) * 100)
      const avgStreak            = totalMembers > 0
        ? Math.round(userStats.reduce((s, u) => s + u.streak, 0) / totalMembers)
        : 0
      const isHistorical = asOfDate !== today

      // Build the member rows table
      const memberRows = userStats.map((u, i) => `
        <tr>
          <td style="padding:7px 12px;border-bottom:1px solid #21262d;color:#6e7681;font-size:12px;">${i + 1}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #21262d;color:#e6edf3;">${u.name}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #21262d;color:${u.phone ? '#5dffdd' : '#6e7681'};">${u.phone ?? '—'}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #21262d;color:#e6edf3;text-align:center;">${u.totalCheckins} <span style="color:#6e7681;font-size:11px;">/ ${daysElapsed}</span></td>
          <td style="padding:7px 12px;border-bottom:1px solid #21262d;color:${u.completionPct >= 80 ? '#5dffdd' : u.completionPct >= 50 ? '#e6edf3' : '#6e7681'};text-align:center;">${u.completionPct}%</td>
          <td style="padding:7px 12px;border-bottom:1px solid #21262d;color:${u.streak >= 7 ? '#5dffdd' : '#e6edf3'};text-align:center;">${u.streak}🔥</td>
          <td style="padding:7px 12px;border-bottom:1px solid #21262d;color:#6e7681;font-size:11px;">${u.joined}</td>
        </tr>
      `).join('')

      await sendAdminEmail({
        subject: `📊 Squad Report — ${isHistorical ? asOfDate : `Day ${daysElapsed}`} of ${durationDays} (${overallPct}% overall)`,
        html: emailWrap(`
          ${emailH2('Squad Stats Report')}
          ${emailMeta(`${isHistorical ? `As of ${asOfDate}` : `Generated ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PST`} · Day ${daysElapsed} of ${durationDays}`)}

          <!-- Overview cards -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <tr>
              <td style="padding:12px;background:#161b22;border-radius:8px;text-align:center;width:25%;">
                <div style="color:#5dffdd;font-size:24px;font-weight:700;">${totalMembers}</div>
                <div style="color:#6e7681;font-size:11px;margin-top:2px;">Members</div>
              </td>
              <td style="width:8px;"></td>
              <td style="padding:12px;background:#161b22;border-radius:8px;text-align:center;width:25%;">
                <div style="color:#5dffdd;font-size:24px;font-weight:700;">${asOfDateCheckins}</div>
                <div style="color:#6e7681;font-size:11px;margin-top:2px;">${isHistorical ? asOfDate : 'Today'}</div>
              </td>
              <td style="width:8px;"></td>
              <td style="padding:12px;background:#161b22;border-radius:8px;text-align:center;width:25%;">
                <div style="color:#5dffdd;font-size:24px;font-weight:700;">${overallPct}%</div>
                <div style="color:#6e7681;font-size:11px;margin-top:2px;">Overall Rate</div>
              </td>
              <td style="width:8px;"></td>
              <td style="padding:12px;background:#161b22;border-radius:8px;text-align:center;width:25%;">
                <div style="color:#5dffdd;font-size:24px;font-weight:700;">${membersWithPhone}</div>
                <div style="color:#6e7681;font-size:11px;margin-top:2px;">SMS Opted In</div>
              </td>
            </tr>
          </table>

          ${emailRow('Total check-ins all time', String(totalCheckinsAllTime))}
          ${emailRow('Average current streak', `${avgStreak} days`)}
          ${emailRow('Challenge progress', `Day ${daysElapsed} of ${durationDays}`)}

          <!-- Member table -->
          <h3 style="color:#e6edf3;margin:24px 0 8px;font-size:14px;">All Members (ranked by check-ins)</h3>
          <table style="border-collapse:collapse;width:100%;background:#161b22;border-radius:8px;overflow:hidden;font-size:12px;">
            <thead>
              <tr style="background:#1c2128;">
                <th style="padding:8px 12px;text-align:left;color:#5dffdd;">#</th>
                <th style="padding:8px 12px;text-align:left;color:#5dffdd;">Name</th>
                <th style="padding:8px 12px;text-align:left;color:#5dffdd;">Phone</th>
                <th style="padding:8px 12px;text-align:center;color:#5dffdd;">Check-ins</th>
                <th style="padding:8px 12px;text-align:center;color:#5dffdd;">Rate</th>
                <th style="padding:8px 12px;text-align:center;color:#5dffdd;">Streak</th>
                <th style="padding:8px 12px;text-align:left;color:#5dffdd;">Joined</th>
              </tr>
            </thead>
            <tbody>${memberRows}</tbody>
          </table>
        `),
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 })
  } catch (err: any) {
    console.error('admin-notify error:', err)
    return NextResponse.json({ error: err?.message ?? 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * GET handler — called automatically by Vercel Cron every day at 7 pm PST.
 * Vercel sends a GET request (not POST), so we forward it as a daily-summary.
 */
export async function GET(request: Request) {
  // Verify the request is from Vercel Cron (optional but recommended)
  const authHeader = request.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Re-use the POST handler with a daily-summary body
  const syntheticRequest = new Request(request.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'authorization': authHeader ?? '' },
    body: JSON.stringify({ type: 'daily-summary' }),
  })
  return POST(syntheticRequest)
}
