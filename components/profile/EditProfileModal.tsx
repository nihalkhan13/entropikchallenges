"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/context/AuthContext"
import { UserPen, Phone } from "lucide-react"

// ── LOCAL DEV ONLY: must match flag in AuthContext.tsx ──
const DEV_BYPASS = false

/** Format raw digits (max 10) into (XXX) XXX-XXXX as the user types */
function formatDisplay(d: string): string {
  if (d.length === 0) return ""
  if (d.length <= 3) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`
}

/** Extract the 10 raw digits from a stored E.164 number like +12025550100 */
function e164ToDigits(e164: string | null | undefined): string {
  if (!e164) return ""
  return e164.replace(/^\+1/, "").replace(/\D/g, "").slice(0, 10)
}

interface EditProfileModalProps {
  open: boolean
  onClose: () => void
  /** Called after a successful save so the parent can refresh the profile */
  onSave: () => void
}

export function EditProfileModal({ open, onClose, onSave }: EditProfileModalProps) {
  const { profile } = useAuth()
  const [name, setName]     = useState("")
  const [digits, setDigits] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState("")

  // Sync fields every time the modal opens
  useEffect(() => {
    if (open && profile) {
      setName(profile.display_name ?? "")
      setDigits(e164ToDigits(profile.phone))
      setError("")
    }
  }, [open, profile])

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10)
    setDigits(raw)
    setError("")
  }

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) { setError("Display name cannot be empty."); return }
    if (trimmed.length < 2) { setError("Name must be at least 2 characters."); return }
    if (trimmed.length > 32) { setError("Name must be 32 characters or fewer."); return }
    if (digits.length > 0 && digits.length !== 10) {
      setError("Phone number must be 10 digits, or clear it to opt out.")
      return
    }

    setSaving(true)
    setError("")

    // Dev bypass: skip DB calls during local development
    if (DEV_BYPASS) {
      setSaving(false)
      onSave()
      onClose()
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      setError("Not authenticated. Please refresh.")
      setSaving(false)
      return
    }

    const prevPhone = profile?.phone ?? null
    const newPhone  = digits.length === 10 ? `+1${digits}` : null

    const { error: dbErr } = await supabase
      .from("profiles")
      .update({
        display_name: trimmed,
        // Save E.164 if 10 digits entered; null clears the number (opts out)
        phone: newPhone,
      })
      .eq("id", user.id)

    setSaving(false)
    if (dbErr) {
      console.error("EditProfileModal save error:", dbErr)
      setError("Failed to save. Please try again.")
    } else {
      // Notify admin only when a phone number is newly added (not on updates or removal)
      if (!prevPhone && newPhone) {
        fetch('/api/admin-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'phone-added', displayName: trimmed, phone: newPhone }),
        }).catch(() => {/* non-critical */})
      }
      onSave()
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-sm bg-[#151a21] border border-brand-glass-border rounded-2xl p-6 shadow-2xl space-y-5"
          >
            {/* Header */}
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-brand-teal/15 border border-brand-teal/30 flex items-center justify-center">
                <UserPen className="w-6 h-6 text-brand-teal" />
              </div>
              <h2 className="text-white font-bold text-lg">Edit Profile</h2>
              <p className="text-brand-gray/60 text-xs leading-relaxed max-w-[260px]">
                Update your display name and SMS notification number.
              </p>
            </div>

            {/* Fields */}
            <div className="space-y-4">
              {/* Display name */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-brand-gray/50 uppercase tracking-widest px-0.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError("") }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave() }}
                  maxLength={32}
                  placeholder="Your display name"
                  autoFocus
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-brand-gray/40 focus:outline-none focus:border-brand-teal/60 transition-colors"
                />
                <p className="text-[10px] text-brand-gray/30 text-right pr-0.5">
                  {name.trim().length} / 32
                </p>
              </div>

              {/* Phone number */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-brand-gray/50 uppercase tracking-widest px-0.5">
                  Phone · SMS Notifications
                </label>
                <div className="flex items-center bg-black/30 border border-white/10 rounded-xl overflow-hidden focus-within:border-brand-teal/60 transition-colors">
                  {/* Fixed +1 badge */}
                  <div className="flex items-center gap-1.5 pl-3.5 pr-3 border-r border-white/10 shrink-0">
                    <Phone className="w-3.5 h-3.5 text-brand-gray/50" />
                    <span className="text-brand-gray/70 text-sm font-medium select-none">+1</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={formatDisplay(digits)}
                    onChange={handlePhoneInput}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSave() }}
                    placeholder="(555) 000-0000"
                    className="flex-1 bg-transparent px-3 py-3 text-white text-sm placeholder:text-brand-gray/30 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-brand-gray/30 px-0.5">
                  US only · leave blank to opt out of SMS reminders
                </p>
              </div>

              {error && (
                <p className="text-xs text-red-400 px-0.5">{error}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="flex-1 py-3 rounded-xl border border-white/10 text-brand-gray text-sm font-semibold hover:bg-white/5 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex-1 py-3 rounded-xl bg-brand-teal text-brand-dark text-sm font-extrabold tracking-tight hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
