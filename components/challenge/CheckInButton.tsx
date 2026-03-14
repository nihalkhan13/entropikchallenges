"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/context/AuthContext"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { getTodayPST } from "@/lib/challenge"
import { CHALLENGE_COPY } from "@/lib/constants"

export function CheckInButton() {
  const { profile } = useAuth()
  const [hasCheckedIn, setHasCheckedIn] = useState(false)
  const [loading, setLoading]           = useState(true)
  const [showConfetti, setShowConfetti] = useState(false)

  const today = getTodayPST()

  useEffect(() => {
    checkStatus()
  }, [profile, today])

  const checkStatus = async () => {
    if (!profile) return

    const { data } = await supabase
      .from("checkins")
      .select("id")
      .eq("user_id", profile.id)
      .eq("date", today)
      .maybeSingle()

    setHasCheckedIn(!!data)
    setLoading(false)
  }

  const handleCheckIn = async () => {
    if (!profile || hasCheckedIn || loading) return

    setLoading(true)
    // Optimistic update
    setHasCheckedIn(true)
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 3000)

    const { error } = await supabase
      .from("checkins")
      .insert([{ user_id: profile.id, date: today }])

    if (error) {
      console.error("Check-in failed:", error)
      setHasCheckedIn(false)
      alert("Check-in failed. Please try again.")
    } else {
      // Immediately refresh CalendarGrid without waiting for realtime
      window.dispatchEvent(new CustomEvent('checkin-success'))
      // Fire-and-forget: trigger Squad Pulse + streak milestone notifications
      const notifyHeaders = { 'Content-Type': 'application/json' }
      fetch('/api/notify', {
        method: 'POST',
        body: JSON.stringify({ type: 'social-pulse' }),
        headers: notifyHeaders,
      }).catch(() => {/* non-critical */})
      fetch('/api/notify', {
        method: 'POST',
        body: JSON.stringify({ type: 'streak-milestone', userId: profile.id }),
        headers: notifyHeaders,
      }).catch(() => {/* non-critical */})
    }
    setLoading(false)
  }

  const handleUndo = async () => {
    if (!confirm("Undo today's check-in?")) return

    setLoading(true)
    setHasCheckedIn(false)

    const { error } = await supabase
      .from("checkins")
      .delete()
      .eq("user_id", profile!.id)
      .eq("date", today)

    if (error) {
      console.error("Undo failed:", error)
      setHasCheckedIn(true)
    }
    setLoading(false)
  }

  return (
    <div className="w-full space-y-2">
      {/* Button + undo share a relative container so undo can be absolutely positioned */}
      <div className="relative w-full">
        <AnimatePresence>
          {showConfetti && <ConfettiBurst />}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={hasCheckedIn ? undefined : handleCheckIn}
          className={cn(
            "relative w-full h-24 rounded-2xl flex items-center justify-center overflow-hidden transition-all duration-500",
            hasCheckedIn
              ? "bg-brand-glass cursor-default border border-brand-teal/50 shadow-[0_0_20px_rgba(93,255,221,0.1)]"
              : "bg-gradient-to-br from-brand-teal to-[#2aa890] shadow-[0_0_30px_rgba(93,255,221,0.4)]"
          )}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
          ) : hasCheckedIn ? (
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Check className="w-8 h-8 text-brand-teal drop-shadow-[0_0_10px_rgba(93,255,221,0.8)]" />
              </motion.div>
              <span className="text-brand-teal font-bold tracking-widest text-sm mt-1">
                {CHALLENGE_COPY.COMPLETE_LABEL}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center px-4 text-center">
              <span className="text-brand-dark font-extrabold text-lg tracking-tight leading-tight">
                {CHALLENGE_COPY.CTA_BUTTON}
              </span>
              <span className="text-brand-dark/60 text-xs font-semibold tracking-widest uppercase mt-1">
                {CHALLENGE_COPY.CTA_CONFIRM}
              </span>
            </div>
          )}

          {/* Repeating shine sweep */}
          {!hasCheckedIn && (
            <motion.div
              className="absolute inset-0 bg-white/20"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear", repeatDelay: 1 }}
              style={{ skewX: "-20deg" }}
            />
          )}
        </motion.button>

        {/* Undo button — absolutely positioned inside the relative wrapper */}
        {hasCheckedIn && (
          <button
            onClick={(e) => { e.stopPropagation(); handleUndo() }}
            className="absolute top-2 right-2 z-20 text-brand-gray/50 hover:text-brand-error p-2 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Hint — only shown to users who haven't added a phone number yet */}
      {!profile?.phone && (
        <p className="text-center text-brand-gray/30 text-[10px] leading-relaxed">
          Want text reminders?{" "}
          <span className="text-brand-gray/50">Tap your name → Edit Profile</span>{" "}
          to add your number.
        </p>
      )}
    </div>
  )
}

function ConfettiBurst() {
  const particles = Array.from({ length: 20 })
  return (
    <div className="absolute inset-0 pointer-events-none flex justify-center items-center overflow-visible z-10">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: 0,
            scale: Math.random() * 1 + 0.5,
            x: (Math.random() - 0.5) * 300,
            y: (Math.random() - 0.5) * 300,
            rotate: Math.random() * 360,
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute w-2 h-2 bg-brand-teal rounded-sm shadow-[0_0_10px_#5dffdd]"
        />
      ))}
    </div>
  )
}
