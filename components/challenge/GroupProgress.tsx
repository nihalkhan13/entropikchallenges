"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { motion } from "framer-motion"
import { getTodayPST } from "@/lib/challenge"

export function GroupProgress() {
  const [percentage, setPercentage] = useState(0)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    fetchProgress()

    const sub = supabase
      .channel('group-progress')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkins' }, () => {
        fetchProgress()
      })
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [])

  const fetchProgress = async () => {
    // Use PST-correct today date to avoid UTC midnight off-by-one
    const today = getTodayPST()

    const [{ count: userCount }, { count: checkinCount }] = await Promise.all([
      supabase.from("profiles").select("*", { count: 'exact', head: true }),
      supabase.from("checkins").select("*", { count: 'exact', head: true }).eq("date", today),
    ])

    if (userCount && userCount > 0) {
      setPercentage(Math.round(((checkinCount ?? 0) / userCount) * 100))
    }
    setLoading(false)
  }

  const radius         = 30
  const circumference  = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex items-center gap-4 bg-brand-glass border border-brand-glass-border rounded-2xl p-4 mb-6 relative overflow-hidden">
      <div className="absolute right-0 top-0 w-32 h-32 bg-brand-teal/5 blur-2xl rounded-full translate-x-10 -translate-y-10 pointer-events-none" />

      <div className="relative w-16 h-16 flex-shrink-0">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="32" cy="32" r={radius}
            className="stroke-brand-gray/20" strokeWidth="6" fill="none"
          />
          <motion.circle
            cx="32" cy="32" r={radius}
            className="stroke-brand-teal drop-shadow-[0_0_4px_theme(colors.brand.teal)]"
            strokeWidth="6" fill="none"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
          {loading ? "..." : `${percentage}%`}
        </div>
      </div>

      <div>
        <p className="text-white font-bold text-lg leading-tight">Group Velocity</p>
        <p className="text-brand-gray text-sm">
          {loading ? "Calculating..." : `${percentage}% of athletes active today`}
        </p>
      </div>
    </div>
  )
}
