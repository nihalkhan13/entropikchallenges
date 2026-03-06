"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
import {
  getTodayPST,
  getChallengeDays,
  getChallengeConfig,
} from "@/lib/challenge"
import { DEFAULT_START_DATE, DEFAULT_DURATION_DAYS } from "@/lib/constants"
import type { Profile } from "@/lib/types"

type CheckinRow = { user_id: string; date: string }

export function CalendarGrid() {
  const { profile: currentProfile } = useAuth()
  const [profiles, setProfiles]   = useState<Profile[]>([])
  const [checkins, setCheckins]   = useState<CheckinRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [startDate, setStartDate] = useState(DEFAULT_START_DATE)
  const [durationDays, setDurationDays] = useState(DEFAULT_DURATION_DAYS)

  const today = getTodayPST()
  const isAdmin = currentProfile?.is_admin === true

  useEffect(() => {
    fetchData()

    // Realtime: re-fetch on any checkins change
    const sub = supabase
      .channel('calendar-checkins')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkins' }, () => {
        fetchData()
      })
      .subscribe()

    // Immediate refresh when CheckInButton fires (avoids realtime delay)
    const handleCheckinSuccess = () => fetchData()
    window.addEventListener('checkin-success', handleCheckinSuccess)

    return () => {
      supabase.removeChannel(sub)
      window.removeEventListener('checkin-success', handleCheckinSuccess)
    }
  }, [])

  const fetchData = async () => {
    try {
      const config = await getChallengeConfig(supabase)
      setStartDate(config.startDate)
      setDurationDays(config.durationDays)

      const [profilesRes, checkinsRes] = await Promise.all([
        supabase.from("profiles").select("id, display_name").order("display_name"),
        supabase.from("checkins").select("user_id, date"),
      ])

      if (profilesRes.data)  setProfiles(profilesRes.data as Profile[])
      if (checkinsRes.data)  setCheckins(checkinsRes.data)
    } catch (e) {
      console.error("CalendarGrid fetch error:", e)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Admin-only toggle. Works for both own row (via supabase client, RLS allows own rows)
   * and other users' rows (via server API route that uses the service-role key).
   */
  const handleToggleDate = async (targetUserId: string, date: string) => {
    if (!isAdmin) return
    if (date > today) return  // no future edits

    const isChecked = checkins.some(
      (c) => c.user_id === targetUserId && c.date === date
    )

    // Optimistic update
    setCheckins(
      isChecked
        ? checkins.filter((c) => !(c.user_id === targetUserId && c.date === date))
        : [...checkins, { user_id: targetUserId, date }]
    )

    if (targetUserId === currentProfile?.id) {
      // Admin editing their own row — RLS permits this via the anon client
      if (isChecked) {
        await supabase.from("checkins").delete().match({ user_id: targetUserId, date })
      } else {
        await supabase.from("checkins").insert({ user_id: targetUserId, date })
      }
    } else {
      // Admin editing another user's row — must go through the service-role API
      const res = await fetch('/api/admin/checkins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: targetUserId, date, action: isChecked ? 'remove' : 'add' }),
      })
      if (!res.ok) {
        // Roll back optimistic update on error
        setCheckins(
          isChecked
            ? [...checkins, { user_id: targetUserId, date }]
            : checkins.filter((c) => !(c.user_id === targetUserId && c.date === date))
        )
      }
    }
  }

  // Generate all challenge day strings using PST-safe offsetDate
  const challengeDays = getChallengeDays(startDate, durationDays)

  if (loading) {
    return <div className="h-40 animate-pulse bg-brand-glass rounded-xl" />
  }

  return (
    <div className="w-full overflow-x-auto pb-4">
      {/* min-width prevents squishing; cells are 18px wide for 100 cols */}
      <div style={{ minWidth: `${120 + durationDays * 19}px` }}>
        {/* Header row: day numbers */}
        <div
          className="gap-[2px] mb-2"
          style={{
            display: 'grid',
            gridTemplateColumns: `120px repeat(${durationDays}, minmax(14px, 1fr))`,
          }}
        >
          <div className="text-xs text-brand-gray font-bold uppercase tracking-wider sticky left-0 bg-brand-dark z-10 p-1">
            ATHLETE
          </div>
          {challengeDays.map((_, i) => (
            <div key={i} className="text-[9px] text-brand-gray/60 text-center leading-none py-1">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Athlete rows */}
        <div className="space-y-[2px]">
          {profiles.map((profile) => {
            const isMe = currentProfile?.id === profile.id
            return (
              <div
                key={profile.id}
                className="hover:bg-white/5 transition-colors rounded-lg items-center gap-[2px]"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `120px repeat(${durationDays}, minmax(14px, 1fr))`,
                }}
              >
                <div
                  className={cn(
                    "text-xs font-medium truncate pr-2 sticky left-0 bg-brand-dark z-10 py-1",
                    isMe ? "text-brand-teal" : "text-gray-300"
                  )}
                >
                  {profile.display_name}
                </div>

                {challengeDays.map((date) => {
                  const isChecked = checkins.some(
                    (c) => c.user_id === profile.id && c.date === date
                  )
                  const isPast  = date < today
                  const isToday = date === today
                  // Only admins can interact with any cell; regular users see read-only grid
                  const canInteract = isAdmin && date <= today

                  let status = "upcoming"
                  if (isChecked)       status = "completed"
                  else if (isPast)     status = "missed"
                  else if (isToday)    status = "today"

                  return (
                    <div
                      key={`${profile.id}-${date}`}
                      onClick={() => canInteract && handleToggleDate(profile.id, date)}
                      className={cn(
                        "aspect-square flex items-center justify-center relative group",
                        canInteract && "cursor-pointer"
                      )}
                    >
                      {canInteract && (
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2px]" />
                      )}
                      <motion.div
                        initial={false}
                        animate={{
                          scale: isChecked ? 1 : 0.8,
                          opacity: status === "upcoming" ? 0.25 : 1,
                        }}
                        className={cn(
                          "w-full h-full rounded-[2px] transition-colors duration-200",
                          status === "completed" && "bg-brand-teal shadow-[0_0_4px_theme(colors.brand.teal)]",
                          status === "missed"    && "bg-brand-error opacity-50",
                          status === "upcoming"  && "bg-brand-gray/20",
                          status === "today" && !isChecked && "bg-brand-gray/20 border border-brand-teal/50 animate-pulse"
                        )}
                      />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
