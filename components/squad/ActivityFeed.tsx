"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Activity } from "@/lib/types"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/context/AuthContext"
import { ActivityItem } from "./ActivityItem"
import { Flame } from "lucide-react"
import { CHALLENGE_COPY, DEFAULT_START_DATE } from "@/lib/constants"
import { getChallengeConfig } from "@/lib/challenge"

export function ActivityFeed() {
  const { profile } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading]       = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [startDate, setStartDate]   = useState(DEFAULT_START_DATE)

  const isAdmin = profile?.is_admin === true

  useEffect(() => {
    getChallengeConfig(supabase).then((cfg) => setStartDate(cfg.startDate))
    fetchActivities()

    // Realtime: new activities pushed to top of feed
    const sub = supabase
      .channel('squad-pulse-activities')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activities' },
        async (payload) => {
          const { data } = await supabase
            .from('activities')
            .select('*, profile:profiles(*)')
            .eq('id', payload.new.id)
            .single()
          if (data) {
            setActivities((prev) => [data as Activity, ...prev].slice(0, 50))
          }
        }
      )
      .subscribe()

    // Fallback: when the current user checks in, refetch immediately so their
    // entry appears even if Supabase Realtime isn't delivering the event.
    // The DB trigger creates the activity record synchronously, so a small
    // delay is enough for it to be readable.
    const handleCheckinSuccess = () => {
      fetchActivities()
      setTimeout(fetchActivities, 1500)
    }
    window.addEventListener('checkin-success', handleCheckinSuccess)

    return () => {
      supabase.removeChannel(sub)
      window.removeEventListener('checkin-success', handleCheckinSuccess)
    }
  }, [])

  const fetchActivities = async () => {
    const { data, error } = await supabase
      .from('activities')
      .select('*, profile:profiles(*)')
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) setActivities(data as Activity[])
    if (error) console.error("ActivityFeed fetch error:", error)
    setLoading(false)
  }

  /**
   * Admin-only: delete a Squad Pulse entry by ID.
   * Calls the server API route (service-role) then removes it from local state.
   */
  const handleDeleteActivity = async (id: string) => {
    // Optimistic removal
    setActivities((prev) => prev.filter((a) => a.id !== id))

    const res = await fetch(`/api/admin/activities/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      // Roll back on error
      console.error('Failed to delete activity, refreshing feed')
      fetchActivities()
    }
  }

  // Memoize the visible slice to avoid recomputing on unrelated state changes
  const visibleActivities = useMemo(
    () => (isExpanded ? activities : activities.slice(0, 3)),
    [activities, isExpanded]
  )
  const hasMore = activities.length > 3

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-brand-glass animate-pulse rounded-2xl border border-brand-glass-border" />
        ))}
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Flame className="w-5 h-5 text-brand-teal" />
        <h2 className="text-white font-bold text-lg uppercase tracking-wider">
          {CHALLENGE_COPY.SQUAD_PULSE_HEADER}
        </h2>
      </div>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {visibleActivities.length > 0 ? (
            visibleActivities.map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                currentUserId={profile?.id}
                startDate={startDate}
                isAdmin={isAdmin}
                onDelete={isAdmin ? handleDeleteActivity : undefined}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-10 text-brand-gray/50 text-sm italic"
            >
              No activity yet. Be the first to check in!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-3 text-[10px] font-black text-brand-teal/40 hover:text-brand-teal uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group bg-brand-glass/30 rounded-xl border border-brand-glass-border/20 hover:border-brand-teal/30"
        >
          <span className="w-8 h-[1px] bg-brand-teal/10 group-hover:bg-brand-teal/30 transition-all" />
          {isExpanded ? <>SHOW LESS</> : <>VIEW {activities.length - 3} MORE UPDATES</>}
          <span className="w-8 h-[1px] bg-brand-teal/10 group-hover:bg-brand-teal/30 transition-all" />
        </button>
      )}
    </section>
  )
}
