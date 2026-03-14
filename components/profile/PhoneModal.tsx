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

/** Strip formatting characters; return null if not a plausible E.164 number. */
function normalisePhone(raw: string): string | null {
  const stripped = raw.replace(/[\s\-().]/g, '')
  if (/^\+[1-9]\d{6,14}$/.test(stripped)) return stripped
  return null
}

export function PhoneModal({ onDone }: PhoneModalProps) {
  const { profile } = useAuth()
  const [phone, setSphone]  = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState("")

  const handleSave = async () => {
    const normalised = normalisePhone(phone)
    if (!normalised) {
      setError("Enter a valid phone number with country code · e.g. +12025550100")
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

    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ phone: normalised })
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
              Get a quick SMS when you haven't planked yet, or when half your squad has already crushed it. No spam — just nudges.
            </p>
          </div>

          {/* Input */}
          <div className="space-y-2">
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray/40 pointer-events-none" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setSphone(e.target.value); setError("") }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave() }}
                placeholder="+1 (555) 000-0000"
                autoFocus
                className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-brand-gray/40 focus:outline-none focus:border-brand-teal/60 transition-colors"
              />
            </div>
            {error && (
              <p className="text-xs text-red-400 px-1">{error}</p>
            )}
            <p className="text-[10px] text-brand-gray/30 px-1">
              Include your country code · +1 for US &amp; Canada
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !phone.trim()}
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
