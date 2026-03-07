"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { TrendingUp } from "lucide-react"
import { getChallengeConfig, getCurrentDay } from "@/lib/challenge"

type LeaderboardEntry = {
  display_name: string
  completionRate: number
  total: number
  firstDate: string
}

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    const [cfg, profilesRes, checkinsRes] = await Promise.all([
      getChallengeConfig(supabase),
      supabase.from("profiles").select("id, display_name"),
      supabase.from("checkins").select("user_id, date"),
    ])

    const profiles = profilesRes.data
    const checkins = checkinsRes.data
    if (!profiles || !checkins) return

    const currentDay = Math.max(getCurrentDay(cfg.startDate), 1)

    const result: LeaderboardEntry[] = profiles.map((p) => {
      const userCheckins = checkins.filter((c) => c.user_id === p.id)
      const total = userCheckins.length
      const completionRate = Math.round((total / currentDay) * 100)
      // Earliest check-in date — used as tiebreaker (who completed first)
      const sortedDates = userCheckins.map((c) => c.date).sort()
      const firstDate = sortedDates[0] ?? '9999-12-31'

      return { display_name: p.display_name, completionRate, total, firstDate }
    })

    // Sort: completion rate DESC, then earliest first check-in ASC (tiebreaker)
    result.sort((a, b) => {
      if (b.completionRate !== a.completionRate) return b.completionRate - a.completionRate
      return a.firstDate.localeCompare(b.firstDate)
    })

    setEntries(result)
  }

  return (
    <div className="space-y-3">
      <h3 className="text-brand-gray text-xs font-bold uppercase tracking-widest mb-4">
        Leaderboard
      </h3>

      {entries.map((entry, i) => (
        <div
          key={entry.display_name}
          className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5"
        >
          <div className="flex items-center gap-3">
            <div className="text-brand-gray font-mono text-sm w-4">{i + 1}</div>
            <div className="text-white font-medium truncate max-w-[140px]">
              {entry.display_name}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-brand-teal">
              <TrendingUp className="w-4 h-4" />
              <span className="font-bold">{entry.completionRate}%</span>
            </div>
            <div className="text-brand-gray text-sm">{entry.total} days</div>
          </div>
        </div>
      ))}
    </div>
  )
}
