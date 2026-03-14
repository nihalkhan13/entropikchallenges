/**
 * lib/sms.ts
 *
 * Thin wrapper around the Telnyx v2 Messages API for sending SMS.
 *
 * Required environment variables (set in .env.local / Vercel dashboard):
 *   TELNYX_API_KEY        – API v2 key from telnyx.com/account/portal/api-keys
 *   TELNYX_PHONE_NUMBER   – Your Telnyx number in E.164, e.g. "+12025550100"
 *
 * Optional:
 *   TELNYX_MESSAGING_PROFILE_ID  – Messaging profile UUID (needed for some
 *                                   US 10DLC / toll-free campaigns)
 */

const TELNYX_API_URL = 'https://api.telnyx.com/v2/messages'

/** Strip formatting characters and validate E.164 format (+<digits>). */
function normalisePhone(raw: string): string | null {
  const stripped = raw.replace(/[\s\-().]/g, '')
  if (/^\+[1-9]\d{6,14}$/.test(stripped)) return stripped
  return null
}

/**
 * Send a single SMS message via Telnyx.
 * Returns `true` if the API accepted the message, `false` on any error.
 * Never throws — callers can fire-and-forget safely.
 */
export async function sendSMS({
  to,
  message,
}: {
  to: string
  message: string
}): Promise<boolean> {
  const apiKey  = process.env.TELNYX_API_KEY
  const fromNum = process.env.TELNYX_PHONE_NUMBER

  if (!apiKey || !fromNum) {
    console.warn('[SMS] TELNYX_API_KEY or TELNYX_PHONE_NUMBER not set — skipping')
    return false
  }

  const toNormalised = normalisePhone(to)
  if (!toNormalised) {
    console.warn('[SMS] Invalid phone number (must be E.164):', to)
    return false
  }

  const body: Record<string, string> = {
    from: fromNum,
    to:   toNormalised,
    text: message,
  }

  const profileId = process.env.TELNYX_MESSAGING_PROFILE_ID
  if (profileId) body.messaging_profile_id = profileId

  try {
    const res = await fetch(TELNYX_API_URL, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[SMS] Telnyx error', res.status, errText)
      return false
    }

    return true
  } catch (err) {
    console.error('[SMS] fetch failed:', err)
    return false
  }
}
