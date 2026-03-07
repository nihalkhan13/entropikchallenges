"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Smartphone } from "lucide-react"

/**
 * Collapsible accordion with OS-specific instructions for adding the app to
 * the device home screen. Shown below PlankInstructions on both the dashboard
 * and the login page.
 */
export function HomeScreenInstructions() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-2xl border border-brand-glass-border overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-brand-glass hover:bg-white/5 transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-gray">
          <Smartphone className="w-3.5 h-3.5 text-brand-teal shrink-0" />
          Add to home screen
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-brand-teal shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-brand-gray/50 shrink-0" />
        )}
      </button>

      {/* Collapsible content */}
      {open && (
        <div className="px-4 pb-5 pt-3 bg-brand-glass/50 space-y-5">
          <p className="text-[11px] text-brand-gray/60 leading-relaxed">
            Install this app on your home screen for the fastest daily check-in experience — no browser needed.
          </p>

          {/* iOS / Safari */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-brand-teal uppercase tracking-widest">
              iPhone / iPad (Safari)
            </p>
            <ol className="space-y-1.5 text-xs text-brand-gray/80 leading-relaxed list-none">
              <li className="flex items-start gap-2">
                <span className="text-brand-teal font-bold shrink-0">1.</span>
                Open this site in <span className="text-white font-semibold">Safari</span> (not Chrome or another browser)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-teal font-bold shrink-0">2.</span>
                Tap the <span className="text-white font-semibold">Share</span> button at the bottom of the screen (box with an arrow pointing up)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-teal font-bold shrink-0">3.</span>
                Scroll down and tap <span className="text-white font-semibold">Add to Home Screen</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-teal font-bold shrink-0">4.</span>
                Tap <span className="text-white font-semibold">Add</span> — the app icon will appear on your home screen
              </li>
            </ol>
          </div>

          {/* Android / Chrome */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-brand-teal uppercase tracking-widest">
              Android (Chrome)
            </p>
            <ol className="space-y-1.5 text-xs text-brand-gray/80 leading-relaxed list-none">
              <li className="flex items-start gap-2">
                <span className="text-brand-teal font-bold shrink-0">1.</span>
                Open this site in <span className="text-white font-semibold">Chrome</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-teal font-bold shrink-0">2.</span>
                Tap the <span className="text-white font-semibold">menu</span> (three dots ⋮) in the top-right corner
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-teal font-bold shrink-0">3.</span>
                Tap <span className="text-white font-semibold">Add to Home screen</span> or <span className="text-white font-semibold">Install app</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-teal font-bold shrink-0">4.</span>
                Tap <span className="text-white font-semibold">Add</span> to confirm
              </li>
            </ol>
          </div>

          <p className="text-[10px] text-brand-gray/30 uppercase tracking-widest text-center font-semibold pt-1">
            Best experience. No app store required.
          </p>
        </div>
      )}
    </div>
  )
}
