"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Reaction } from "@/lib/types"
import { motion, AnimatePresence } from "framer-motion"

export function ReactionsList({ activityId }: { activityId: string }) {
  const [reactions, setReactions] = useState<Reaction[]>([])

  useEffect(() => {
    fetchReactions()

    const channel = supabase
      .channel(`activity_reactions_${activityId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'reactions',
        filter: `activity_id=eq.${activityId}`,
      }, (payload) => {
        setReactions((prev) => [...prev, payload.new as Reaction])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activityId])

  const fetchReactions = async () => {
    const { data } = await supabase
      .from('reactions')
      .select('*')
      .eq('activity_id', activityId)

    if (data) setReactions(data as Reaction[])
  }

  // Aggregate reactions: emoji → count
  const counts = reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (Object.keys(counts).length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      <AnimatePresence>
        {Object.entries(counts).map(([emoji, count]) => (
          <motion.div
            key={emoji}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1 bg-white/5 border border-brand-glass-border/30 px-2 py-0.5 rounded-full text-xs text-brand-gray/80 hover:bg-white/10 transition-colors cursor-default"
            title={`${count} reactions`}
          >
            <span className="text-[14px]">{emoji}</span>
            {count > 1 && <span className="font-bold text-[10px] opacity-70">{count}</span>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
