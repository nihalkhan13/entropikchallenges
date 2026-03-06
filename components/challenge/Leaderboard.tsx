"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Flame } from "lucide-react"
import { calculateCurrentStreak } from "@/lib/challenge"

type LeaderboardEntry = {
  display_name: string
  streak: number
  total: number
}

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    const [profilesRes, checkinsRes] = await Promise.all([
      supabase.from("profiles").select("id, display_name"),
      supabase.from("checkins").select("user_id, date"),
    ])

    const profiles = profilesRes.data
    const checkins = checkinsRes.data
    if (!profiles || !checkins) return

    const result = profiles.map((p) => {
      const userCheckins = checkins
        .filter((c) => c.user_id === p.id)
        .map((c) => c.date)

      return {
        display_name: p.display_name,
        streak:       calculateCurrentStreak(userCheckins),
        total:        userCheckins.length,
      }
    })

    // Sort: streak DESC, total DESC
    result.sort((a, b) => b.streak - a.streak || b.total - a.total)
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
              <Flame className="w-4 h-4 fill-brand-teal" />
              <span className="font-bold">{entry.streak}</span>
            </div>
            <div className="text-brand-gray text-sm">{entry.total} total</div>
          </div>
        </div>
      ))}
    </div>
  )
}
