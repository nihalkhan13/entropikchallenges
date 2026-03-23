/**
 * lib/sms.ts — Telnyx SMS utility (server-side only)
 *
 * Sends a text message via the Telnyx REST API.
 * Silently no-ops if TELNYX_API_KEY or TELNYX_PHONE_NUMBER are missing.
 * Throws on API errors so callers can surface the message.
 */

export async function sendSms(to: string, message: string): Promise<boolean> {
  const apiKey            = process.env.TELNYX_API_KEY
  const from              = process.env.TELNYX_PHONE_NUMBER
  const messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID

  if (!apiKey || !from) {
    console.warn('sendSms: missing TELNYX_API_KEY or TELNYX_PHONE_NUMBER — skipped')
    return false
  }

  const body: Record<string, string> = { from, to, text: message }
  if (messagingProfileId) body.messaging_profile_id = messagingProfileId

  const res = await fetch('https://api.telnyx.com/v2/messages', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  const payload = await res.json().catch(() => ({}))

  if (!res.ok) {
    const detail = (payload as any)?.errors?.[0]?.detail ?? `HTTP ${res.status}`
    console.error('sendSms Telnyx error:', detail, JSON.stringify(payload))
    throw new Error(detail)
  }

  // Log the Telnyx message ID and delivery status for debugging
  const data = (payload as any)?.data
  const toStatus = data?.to?.[0]?.status ?? 'unknown'
  const msgId    = data?.id ?? 'unknown'
  console.log(`sendSms OK → id:${msgId} to:${to} status:${toStatus}`)

  // Telnyx can return HTTP 200 but include errors in the response body
  const responseErrors = data?.errors
  if (Array.isArray(responseErrors) && responseErrors.length > 0) {
    const detail = responseErrors[0]?.detail ?? 'Unknown Telnyx error in response'
    console.error('sendSms Telnyx response error:', detail)
    throw new Error(detail)
  }

  return true
}
