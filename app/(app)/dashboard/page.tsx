"use client"

import { useAuth } from "@/context/AuthContext"
import { CheckInButton } from "@/components/challenge/CheckInButton"
import { CalendarGrid } from "@/components/challenge/CalendarGrid"
import { GroupProgress } from "@/components/challenge/GroupProgress"
import { Leaderboard } from "@/components/challenge/Leaderboard"
import { ActivityFeed } from "@/components/squad/ActivityFeed"
import { PerformanceReport } from "@/components/reports/PerformanceReport"
import { calculatePerformanceStats } from "@/lib/stats"
import { motion, AnimatePresence } from "framer-motion"
import { Settings, BarChart3 } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import Link from "next/link"
import { getChallengeConfig, getCurrentDay, getTodayPST } from "@/lib/challenge"
import { CHALLENGE_COPY } from "@/lib/constants"
import { cn } from "@/lib/utils"

type Countdown = { days: number; hours: number; minutes: number; seconds: number }

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [showReport, setShowReport] = useState(false)
  const [currentDay, setCurrentDay] = useState(1)

  // Countdown / pre-launch state
  const [challengeStarted, setChallengeStarted] = useState(true) // true by default → no flash
  const [countdownTarget, setCountdownTarget] = useState("")
  const [countdown, setCountdown] = useState<Countdown>({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  // Load config and decide whether to show countdown
  useEffect(() => {
    getChallengeConfig(supabase).then((cfg) => {
      setCurrentDay(getCurrentDay(cfg.startDate))
      const today = getTodayPST()
      // Validate startDate is a real parseable date before showing the countdown.
      // An invalid/typo date would produce NaN, causing the countdown to freeze.
      const startMs = new Date(`${cfg.startDate}T00:00:00-08:00`).getTime()
      const isValidDate = !isNaN(startMs)
      if (isValidDate && today < cfg.startDate) {
        setChallengeStarted(false)
        setCountdownTarget(cfg.startDate)
      } else {
        setChallengeStarted(true)
      }
    })
  }, [])

  // Tick every second while waiting for start
  useEffect(() => {
    if (challengeStarted || !countdownTarget) return

    const tick = () => {
      const now = new Date()
      const target = new Date(`${countdownTarget}T00:00:00-08:00`) // midnight PST
      const diff = target.getTime() - now.getTime()
      // Also guard against NaN (invalid target date) — treat as already started
      if (diff <= 0 || isNaN(diff)) {
        setChallengeStarted(true)
        return
      }
      setCountdown({
        days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours:   Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [challengeStarted, countdownTarget])

  useEffect(() => {
    if (profile) fetchStats()
  }, [profile])

  const fetchStats = async () => {
    if (!profile) return
    const cfg = await getChallengeConfig(supabase)
    const { data: checkins } = await supabase
      .from('checkins')
      .select('date')
      .eq('user_id', profile.id)

    if (checkins) {
      const day = getCurrentDay(cfg.startDate)
      const calculated = calculatePerformanceStats(
        profile.display_name,
        checkins,
        cfg.startDate,
        day
      )
      setStats(calculated)
    }
  }

  // Human-readable start date label for the countdown card
  const startLabel = countdownTarget
    ? new Date(`${countdownTarget}T00:00:00-08:00`).toLocaleDateString('en-US', {
        timeZone: 'America/Los_Angeles',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

  return (
    <div className="relative">

      {/* ── Pre-launch countdown overlay ── */}
      {!challengeStarted && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-start pt-12 pointer-events-none">
          <div className="pointer-events-auto bg-[#0d1014]/95 backdrop-blur-md border border-brand-teal/20 rounded-2xl p-8 text-center space-y-5 w-full max-w-[300px] shadow-[0_0_60px_rgba(93,255,221,0.12)]">
            <div>
              <p className="text-brand-teal text-[10px] uppercase tracking-[0.3em] font-bold mb-1">
                Challenge begins in
              </p>
              {startLabel && (
                <p className="text-brand-gray/40 text-[10px] uppercase tracking-widest">
                  {startLabel}
                </p>
              )}
            </div>

            <div className="flex gap-2 justify-center">
              {(
                [
                  { val: countdown.days,    label: 'DAYS' },
                  { val: countdown.hours,   label: 'HRS'  },
                  { val: countdown.minutes, label: 'MIN'  },
                  { val: countdown.seconds, label: 'SEC'  },
                ] as { val: number; label: string }[]
              ).map(({ val, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center bg-brand-glass rounded-xl p-3 min-w-[52px] border border-brand-glass-border"
                >
                  <span className="text-3xl font-black text-brand-teal tabular-nums leading-none">
                    {String(val).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] text-brand-gray/50 uppercase tracking-widest mt-1.5 font-bold">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-brand-gray/30 text-[10px] uppercase tracking-widest font-semibold">
              Stay Ready. Stay Hard.
            </p>
          </div>
        </div>
      )}

      {/* ── Main content (blurred while waiting for start) ── */}
      <div className={cn(
        "space-y-8",
        !challengeStarted && "blur-sm pointer-events-none select-none opacity-40"
      )}>
        {/* Intro / Welcome */}
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-brand-gray bg-clip-text text-transparent">
              Day {currentDay}
            </h1>
            <p className="text-brand-gray text-sm font-medium">
              {CHALLENGE_COPY.APP_TAGLINE}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowReport(!showReport)}
              className="p-2 bg-brand-glass rounded-xl border border-brand-glass-border/30 text-brand-gray/60 hover:text-brand-teal transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
            <Link href="/settings" className="p-2 bg-brand-glass rounded-xl border border-brand-glass-border/30 text-brand-gray/60 hover:text-brand-teal transition-colors">
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Performance Report */}
        <AnimatePresence>
          {showReport && stats && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <PerformanceReport stats={stats} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Group Stats */}
        <GroupProgress />

        {/* Main Action */}
        <div>
          <CheckInButton />
        </div>

        {/* Activity Feed */}
        <ActivityFeed />

        {/* Calendar */}
        <section className="bg-brand-glass rounded-2xl p-4 border border-brand-glass-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-lg">Squad Grid</h2>
            <div className="flex gap-2 text-[10px] text-brand-gray bg-black/20 px-2 py-1 rounded-full">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-brand-teal" /> DONE</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-brand-error" /> MISSED</span>
            </div>
          </div>
          <CalendarGrid />
        </section>

        {/* Leaderboard */}
        <section>
          <Leaderboard />
        </section>

        {/* Footer Quote */}
        <div className="text-center pt-8 pb-4 text-brand-gray/30 text-xs uppercase tracking-widest font-semibold">
          {CHALLENGE_COPY.FOOTER_QUOTE}
        </div>
      </div>
    </div>
  )
}
