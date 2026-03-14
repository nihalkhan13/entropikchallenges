"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/context/AuthContext"
import { MessageSquare, Phone } from "lucide-react"

// ── LOCAL DEV ONLY: must match flag in AuthContext.tsx ──
const DEV_BYPASS = false

interface PhoneModalProps {
  /** Called when the user saves a number or explicitly skips */
  onDone: () => void
}

/** Format raw digits (max 10) into (XXX) XXX-XXXX as the user types. */
function formatDisplay(d: string): string {
  if (d.length === 0) return ""
  if (d.length <= 3) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`
}

export function PhoneModal({ onDone }: PhoneModalProps) {
  const { profile } = useAuth()
  const [digits, setDigits] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState("")

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip everything except digits, cap at 10
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10)
    setDigits(raw)
    setError("")
  }

  const handleSave = async () => {
    if (digits.length !== 10) {
      setError("Enter your 10-digit US number (area code + number).")
      return
    }

    setSaving(true)
    setError("")

    // Dev bypass: skip DB write so the modal can be tested locally
    if (DEV_BYPASS) {
      setSaving(false)
      onDone()
      return
    }

    if (!profile) {
      setError("Not authenticated — please refresh.")
      setSaving(false)
      return
    }

    const e164 = `+1${digits}`

    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ phone: e164 })
      .eq("id", profile.id)

    setSaving(false)
    if (dbErr) {
      console.error("PhoneModal save error:", dbErr)
      setError("Couldn't save your number. Please try again.")
    } else {
      onDone()
    }
  }

  return (
    <AnimatePresence>
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
              <MessageSquare className="w-6 h-6 text-brand-teal" />
            </div>
            <h2 className="text-white font-bold text-lg">Stay in the loop</h2>
            <p className="text-brand-gray/60 text-xs leading-relaxed max-w-[260px]">
              Get a quick text when you haven't planked yet or when half your
              squad has already crushed it. No spam — just nudges.
            </p>
            <p className="text-brand-gray/35 text-[10px] leading-relaxed max-w-[260px]">
              You can always add your number later by tapping your name and selecting <span className="text-brand-gray/55">Edit Profile</span>.
            </p>
          </div>

          {/* Input — fixed +1 prefix, digits only, auto-formatted */}
          <div className="space-y-2">
            <div className="flex items-center bg-black/30 border border-white/10 rounded-xl overflow-hidden focus-within:border-brand-teal/60 transition-colors">
              {/* Country code badge */}
              <div className="flex items-center gap-1.5 pl-3.5 pr-3 border-r border-white/10 shrink-0">
                <Phone className="w-3.5 h-3.5 text-brand-gray/50" />
                <span className="text-brand-gray/70 text-sm font-medium select-none">+1</span>
              </div>
              {/* Number input */}
              <input
                type="tel"
                inputMode="numeric"
                value={formatDisplay(digits)}
                onChange={handleInput}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave() }}
                placeholder="(555) 000-0000"
                autoFocus
                className="flex-1 bg-transparent px-3 py-3 text-white text-sm placeholder:text-brand-gray/30 focus:outline-none"
              />
            </div>
            {error && (
              <p className="text-xs text-red-400 px-1">{error}</p>
            )}
            <p className="text-[10px] text-brand-gray/30 px-1">
              US numbers only · enter area code + 7-digit number
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleSave}
              disabled={saving || digits.length !== 10}
              className="w-full py-3 rounded-xl bg-brand-teal text-brand-dark text-sm font-extrabold tracking-tight hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Enable SMS Reminders"}
            </button>
            <button
              onClick={onDone}
              disabled={saving}
              className="w-full py-3 rounded-xl text-brand-gray/40 hover:text-brand-gray/70 text-sm font-semibold transition-colors"
            >
              Skip for now
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
