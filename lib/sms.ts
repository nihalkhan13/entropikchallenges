/**
 * lib/sms.ts — Telnyx SMS utility (server-side only)
 *
 * Sends a text message via the Telnyx REST API.
 * Silently no-ops if TELNYX_API_KEY or TELNYX_PHONE_NUMBER are missing.
 * Throws on API errors so callers can surface the message.
 */

export async function sendSms(to: string, message: string): Promise<boolean> {
  const apiKey = process.env.TELNYX_API_KEY
  const from   = process.env.TELNYX_PHONE_NUMBER

  if (!apiKey || !from) {
    console.warn('sendSms: missing TELNYX_API_KEY or TELNYX_PHONE_NUMBER — skipped')
    return false
  }

  const res = await fetch('https://api.telnyx.com/v2/messages', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to, text: message }),
  })

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    const detail  = (payload as any)?.errors?.[0]?.detail ?? `HTTP ${res.status}`
    console.error('sendSms Telnyx error:', detail)
    throw new Error(detail)
  }

  return true
}
