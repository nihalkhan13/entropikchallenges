import { Resend } from 'resend'

// Lazy-initialise so the module never crashes at import if the key is missing
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

/**
 * Send an email to the admin address.
 * Silently no-ops and returns false if env vars are missing.
 * Never throws — all errors are caught and logged.
 */
export async function sendAdminEmail({
  subject,
  html,
}: {
  subject: string
  html: string
}): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL
  const fromEmail  = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

  if (!process.env.RESEND_API_KEY || !adminEmail) {
    console.warn('sendAdminEmail: missing RESEND_API_KEY or ADMIN_EMAIL — skipped')
    return false
  }

  try {
    const { error } = await getResend().emails.send({ from: fromEmail, to: adminEmail, subject, html })
    if (error) {
      console.error('sendAdminEmail Resend error:', error)
      throw new Error((error as any).message ?? JSON.stringify(error))
    }
    return true
  } catch (err) {
    console.error('sendAdminEmail error:', err)
    throw err   // re-throw so API routes can surface the message
  }
}

/** Shared base styles for admin email HTML */
export function emailWrap(body: string): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                background:#0d1117;color:#e6edf3;max-width:560px;
                margin:0 auto;padding:24px;border-radius:12px;">
      ${body}
    </div>
  `
}

export function emailH2(text: string): string {
  return `<h2 style="color:#5dffdd;margin:0 0 4px;">${text}</h2>`
}

export function emailMeta(text: string): string {
  return `<p style="color:#6e7681;font-size:13px;margin:0 0 16px;">${text}</p>`
}

export function emailRow(label: string, value: string): string {
  return `
    <p style="margin:6px 0;">
      <span style="color:#6e7681;">${label}:</span>
      <strong style="color:#e6edf3;margin-left:6px;">${value}</strong>
    </p>
  `
}
