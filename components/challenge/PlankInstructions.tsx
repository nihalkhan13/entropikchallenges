"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Expandable plank instructions accordion.
 * Can be dropped below the CheckInButton on the dashboard
 * and at the bottom of the login page so newcomers know the form.
 */
export function PlankInstructions() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-2xl border border-brand-glass-border overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-brand-glass hover:bg-white/5 transition-colors text-left"
      >
        <span className="text-xs font-bold uppercase tracking-widest text-brand-gray">
          How to do the plank
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-brand-teal shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-brand-gray/50 shrink-0" />
        )}
      </button>

      {/* Collapsible content */}
      {open && (
        <div className="px-4 pb-5 pt-3 bg-brand-glass/50 space-y-4">
          {/* Plank diagram */}
          <div className="rounded-xl overflow-hidden border border-brand-glass-border">
            <img
              src="/plank-diagram.jpg"
              alt="Plank form diagram"
              className="w-full object-cover"
            />
          </div>

          {/* Instructions */}
          <ul className="space-y-2 text-brand-gray/80 text-xs leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-brand-teal mt-0.5 shrink-0">▸</span>
              <span>
                <span className="text-white font-semibold">Arms locked</span> — elbows directly under shoulders, forearms flat on the floor
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-teal mt-0.5 shrink-0">▸</span>
              <span>
                <span className="text-white font-semibold">Core tight</span> — squeeze your abs, glutes, and quads the entire hold
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-teal mt-0.5 shrink-0">▸</span>
              <span>
                <span className="text-white font-semibold">Body straight</span> — head neutral, hips level — no sagging or piking
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-teal mt-0.5 shrink-0">▸</span>
              <span>
                <span className="text-white font-semibold">Hold for 2 minutes</span> — breathe steadily, don't hold your breath
              </span>
            </li>
          </ul>

          <p className="text-[10px] text-brand-gray/40 uppercase tracking-widest text-center font-semibold pt-1">
            Lock In Every Day
          </p>
        </div>
      )}
    </div>
  )
}
