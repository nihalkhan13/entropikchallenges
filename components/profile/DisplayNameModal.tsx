"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase/client"
import { User } from "lucide-react"

interface DisplayNameModalProps {
  /** Current display name (pre-filled in the input) */
  currentName: string
  /** Called after a successful save — receives the new display name */
  onSave: (newName: string) => void
  /** Whether this is the first-login onboarding flow (vs. editing later) */
  isOnboarding?: boolean
  /** If not onboarding, caller can control visibility */
  open?: boolean
  onClose?: () => void
}

export function DisplayNameModal({
  currentName,
  onSave,
  isOnboarding = false,
  open = true,
  onClose,
}: DisplayNameModalProps) {
  const [name, setName] = useState(currentName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Keep input in sync when prop changes (e.g. when modal re-opens for edit)
  useEffect(() => {
    setName(currentName)
    setError("")
  }, [currentName, open])

  const isVisible = isOnboarding ? true : open

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError("Display name cannot be empty.")
      return
    }
    if (trimmed.length < 2) {
      setError("Name must be at least 2 characters.")
      return
    }
    if (trimmed.length > 32) {
      setError("Name must be 32 characters or fewer.")
      return
    }

    setSaving(true)
    setError("")

    // Get the current user ID
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id
    if (!userId) {
      setError("Not authenticated. Please refresh.")
      setSaving(false)
      return
    }

    // Only update display_name — no has_onboarded column needed in the DB
    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", userId)

    if (dbErr) {
      console.error("DisplayNameModal save error:", dbErr)
      setError("Failed to save. Please try again.")
      setSaving(false)
      return
    }

    // Mark onboarding complete in localStorage so the modal won't reappear
    if (isOnboarding) {
      try {
        localStorage.setItem(`entropik_onboarded_${userId}`, "1")
      } catch {
        // localStorage blocked (e.g. private browsing) — not critical
      }
    }

    setSaving(false)
    onSave(trimmed)
    if (!isOnboarding && onClose) onClose()
  }

  return (
    <AnimatePresence>
      {isVisible && (
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
                <User className="w-6 h-6 text-brand-teal" />
              </div>
              <h2 className="text-white font-bold text-lg">
                {isOnboarding ? "What should we call you?" : "Edit Display Name"}
              </h2>
              <p className="text-brand-gray/60 text-xs leading-relaxed max-w-[260px]">
                {isOnboarding
                  ? "This is the name your squad will see. You can use your Google name or pick a nickname."
                  : "Update the name shown to your squad."}
              </p>
            </div>

            {/* Input */}
            <div className="space-y-2">
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
              {error && (
                <p className="text-xs text-red-400 px-1">{error}</p>
              )}
              <p className="text-[10px] text-brand-gray/30 text-right pr-1">
                {name.trim().length} / 32
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {/* Only show Cancel for the edit (non-onboarding) flow */}
              {!isOnboarding && onClose && (
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-brand-gray text-sm font-semibold hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-brand-teal text-brand-dark text-sm font-extrabold tracking-tight hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Saving…" : isOnboarding ? "Let's Go" : "Save"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
