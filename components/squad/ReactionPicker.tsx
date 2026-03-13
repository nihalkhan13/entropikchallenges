"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/context/AuthContext"
import { motion, AnimatePresence } from "framer-motion"
import { Plus } from "lucide-react"
import { EMOJIS } from "@/lib/constants"

export function ReactionPicker({ activityId }: { activityId: string }) {
  const { profile } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const addReaction = async (emoji: string) => {
    if (!profile || loading) return

    setLoading(true)
    setIsOpen(false)

    // Dispatch immediately so ReactionsList can show the emoji without waiting
    // for the DB round-trip (works even when Supabase Realtime isn't enabled).
    window.dispatchEvent(new CustomEvent('reaction-added', {
      detail: { activityId, emoji, userId: profile.id },
    }))

    try {
      await supabase
        .from('reactions')
        .insert({
          activity_id: activityId,
          user_id: profile.id,
          emoji,
        })
    } catch (err) {
      console.error("Failed to add reaction:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-7 h-7 rounded-full bg-white/5 border border-brand-glass-border/50 flex items-center justify-center hover:bg-white/10 hover:border-brand-teal/30 transition-all text-brand-gray/60 hover:text-brand-teal"
      >
        <Plus className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="absolute bottom-full left-0 mb-2 p-1.5 bg-brand-glass border border-brand-glass-border rounded-full flex gap-1 z-50 backdrop-blur-xl shadow-2xl"
            >
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => addReaction(emoji)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-transform active:scale-125 hover:scale-110"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
