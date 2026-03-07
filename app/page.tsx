import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton"
import { CHALLENGE_COPY, DEFAULT_START_DATE, DEFAULT_DURATION_DAYS } from "@/lib/constants"

// Prevent static prerendering — this page reads cookies + Supabase at request time
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // Redirect authenticated users straight to the dashboard
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect("/dashboard")

  // Load challenge config for display (falls back to defaults if DB unreachable)
  let startDate = DEFAULT_START_DATE
  let durationDays = DEFAULT_DURATION_DAYS
  try {
    const { data } = await supabase.from("challenge_settings").select("key, value")
    const map: Record<string, string> = {}
    if (data) for (const row of data) map[row.key] = row.value
    if (map.start_date) startDate = map.start_date
    if (map.duration_days) durationDays = Number(map.duration_days)
  } catch { /* use defaults */ }

  const startFormatted = new Date(`${startDate}T00:00:00-08:00`)
    .toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-teal/8 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-sm z-10 space-y-6">
        {/* Logo + title */}
        <div className="text-center flex flex-col items-center">
          <img src="/logo.png" alt="ENTROPIK" className="h-28 w-auto mb-4" />
          <h1 className="text-white font-bold text-2xl tracking-tight">
            {CHALLENGE_COPY.APP_TITLE}
          </h1>
          <p className="text-brand-gray text-xs tracking-widest uppercase font-semibold mt-1">
            {CHALLENGE_COPY.APP_TAGLINE}
          </p>
        </div>

        {/* Challenge rules card */}
        <div className="bg-brand-glass border border-brand-glass-border rounded-2xl p-6 space-y-4">
          <p className="text-white font-semibold text-sm">The Challenge</p>
          <ul className="space-y-2 text-brand-gray/80 text-xs leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-brand-teal mt-0.5">▸</span>
              Hold a 2 min plank every single day for {durationDays} days
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-teal mt-0.5">▸</span>
              Check in daily to log your plank
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-teal mt-0.5">▸</span>
              Your squad can see your progress. They&apos;re watching.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-teal mt-0.5">▸</span>
              Challenge starts: <span className="text-white font-medium ml-1">{startFormatted}</span>
            </li>
          </ul>
        </div>

        {/* Plank diagram */}
        <div className="rounded-2xl overflow-hidden border border-brand-glass-border">
          <img
            src="/plank-diagram.jpg"
            alt="Plank form diagram"
            className="w-full object-cover"
          />
        </div>

        {/* Sign-in card */}
        <div className="bg-brand-glass border border-brand-glass-border rounded-2xl p-6 space-y-5">
          <div className="space-y-1">
            <p className="text-white font-semibold text-sm">Join the challenge</p>
            <p className="text-brand-gray/70 text-xs leading-relaxed">
              Sign in with Google to track your planks and compete with your squad.
              No posting is done on your behalf.
            </p>
          </div>
          <GoogleSignInButton />
        </div>

        <p className="text-center text-brand-gray/40 text-xs">
          BY SIGNING IN YOU ACCEPT THE CHALLENGE TERMS
        </p>
      </div>
    </div>
  )
}
