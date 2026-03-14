"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { Loader2, LogOut, Shield, RefreshCw, UserPen } from "lucide-react"
import Link from "next/link"
import { DisplayNameModal }  from "@/components/profile/DisplayNameModal"
import { PhoneModal }        from "@/components/profile/PhoneModal"
import { EditProfileModal }  from "@/components/profile/EditProfileModal"

// ── LOCAL DEV ONLY: must match the flag in AuthContext.tsx ──
const DEV_BYPASS = false

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, profile, isLoading, signOut, refreshProfile } = useAuth()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  // Onboarding: checked against localStorage so no DB migration is required
  const [showOnboarding, setShowOnboarding] = useState(false)
  // Phone-number prompt: shown once after onboarding (or on first load for existing users)
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  // If profile doesn't load within 12s, show a retry prompt
  const [profileStalled, setProfileStalled] = useState(false)

  // Redirect to login only if auth is resolved AND there's no session
  useEffect(() => {
    if (DEV_BYPASS) return
    if (!isLoading && !session) {
      router.replace("/login")
    }
  }, [session, isLoading, router])

  // Detect stalled profile loading: session exists but profile never arrives
  useEffect(() => {
    if (!session || profile) {
      setProfileStalled(false)
      return
    }
    const timer = setTimeout(() => setProfileStalled(true), 12000)
    return () => clearTimeout(timer)
  }, [session, profile])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Decide which onboarding step to show (name → phone).
  // Step 1 — name: first-ever login, collect display name.
  // Step 2 — phone: shown exactly once, right after onboarding (or on first
  //   post-deploy load for existing users). Stamped in localStorage regardless
  //   of whether the user saves or skips — they can always add via Edit Profile.
  useEffect(() => {
    if (!profile || !session?.user?.id) return
    // Dev bypass: skip all onboarding prompts during local development
    if (DEV_BYPASS) {
      try { localStorage.setItem(`entropik_onboarded_${session.user.id}`, "1") } catch { /* ignore */ }
      setShowOnboarding(false)
      return
    }
    try {
      const uid        = session.user.id
      const onboarded  = !!localStorage.getItem(`entropik_onboarded_${uid}`)
      const phoneAsked = !!localStorage.getItem(`entropik_phone_asked_${uid}`)
      if (!onboarded) {
        // First-ever login: collect display name first
        setShowOnboarding(true)
      } else if (!phoneAsked) {
        // Show phone prompt exactly once (save or skip both mark it as seen)
        setShowPhoneModal(true)
      }
    } catch {
      setShowOnboarding(false)
    }
  }, [profile?.id, session?.user?.id])

  // ── Auth still loading: spinner ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-brand-teal animate-spin" />
      </div>
    )
  }

  // ── No session: redirect in flight ──
  if (!session) {
    return null
  }

  // ── Session exists but profile still loading: show loading with retry ──
  if (!profile) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-brand-teal animate-spin" />
          <p className="text-brand-gray text-sm">Loading profile...</p>
          {profileStalled && (
            <div className="flex flex-col items-center gap-3 mt-2">
              <p className="text-brand-gray/60 text-xs text-center max-w-[250px]">
                Taking longer than expected. This can happen if the database is waking up.
              </p>
              <button
                onClick={() => {
                  setProfileStalled(false)
                  refreshProfile()
                }}
                className="flex items-center gap-2 px-4 py-2 bg-brand-teal/20 hover:bg-brand-teal/30 text-brand-teal text-xs font-semibold rounded-xl border border-brand-teal/30 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Fully loaded: render app ──
  return (
    <div className="min-h-screen bg-brand-dark relative overflow-x-hidden">
      {/* Background Mesh */}
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-teal/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      {/* Step 1 — first-login: confirm/set display name */}
      {!DEV_BYPASS && showOnboarding && (
        <DisplayNameModal
          currentName={profile.display_name}
          isOnboarding
          onSave={() => {
            setShowOnboarding(false)
            refreshProfile()
            // Move to phone prompt only if not already seen
            try {
              const uid = session!.user.id
              if (!localStorage.getItem(`entropik_phone_asked_${uid}`)) {
                setShowPhoneModal(true)
              }
            } catch { /* ignore */ }
          }}
        />
      )}

      {/* Step 2 — phone number opt-in: shown exactly once (save or skip both mark it done) */}
      {!DEV_BYPASS && showPhoneModal && (
        <PhoneModal
          onDone={() => {
            setShowPhoneModal(false)
            refreshProfile()
            // Stamp as seen regardless of whether user saved or skipped
            try {
              localStorage.setItem(`entropik_phone_asked_${session!.user.id}`, "1")
            } catch { /* ignore */ }
          }}
        />
      )}

      {/* Edit Profile modal (opened from dropdown) — name + phone in one form */}
      <EditProfileModal
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        onSave={() => { refreshProfile(); setEditProfileOpen(false) }}
      />

      <main className="max-w-md mx-auto min-h-screen flex flex-col p-4 pb-20">
        {/* Header */}
        <header className="flex items-center justify-between py-4 mb-6">
          <div className="flex items-center">
            <img src="/logo.png" alt="ENTROPIK" className="h-24 w-auto -ml-5" />
          </div>

          {/* Profile area with dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="text-right">
                <p className="text-[10px] text-brand-gray uppercase tracking-widest">Operator</p>
                <p className="text-sm font-medium text-brand-teal">{profile.display_name}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-brand-glass border border-brand-glass-border flex items-center justify-center text-xs font-bold text-white">
                {profile.display_name.charAt(0).toUpperCase()}
              </div>
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-[#1a1f26] border border-brand-glass-border rounded-xl shadow-xl overflow-hidden z-50">
                {/* Edit Profile */}
                <button
                  onClick={() => { setMenuOpen(false); setEditProfileOpen(true) }}
                  className="flex items-center gap-2.5 px-4 py-3 text-xs text-brand-gray hover:bg-white/5 hover:text-brand-teal transition-colors w-full text-left"
                >
                  <UserPen className="w-3.5 h-3.5 shrink-0" />
                  Edit Profile
                </button>

                {profile.is_admin && (
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-xs text-brand-gray hover:bg-white/5 hover:text-brand-teal transition-colors border-t border-brand-glass-border/50"
                  >
                    <Shield className="w-3.5 h-3.5 shrink-0" />
                    Admin Panel
                  </Link>
                )}
                <button
                  onClick={() => { setMenuOpen(false); signOut() }}
                  className="flex items-center gap-2.5 px-4 py-3 text-xs text-brand-gray hover:bg-white/5 hover:text-red-400 transition-colors w-full text-left border-t border-brand-glass-border/50"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        {children}
      </main>
    </div>
  )
}
