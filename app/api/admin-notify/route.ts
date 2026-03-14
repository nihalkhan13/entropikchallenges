import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { sendAdminEmail, emailWrap, emailH2, emailMeta, emailRow } from '@/lib/email'
import { getTodayPST } from '@/lib/challenge'

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

    return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 })
  } catch (err) {
    console.error('admin-notify error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
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
