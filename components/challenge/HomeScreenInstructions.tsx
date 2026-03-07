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
        <div className="px-4 pb-5 pt-4 bg-brand-glass/50 space-y-4">
          <p className="text-[11px] text-brand-gray/60 leading-relaxed">
            Install this app on your home screen for the fastest daily check-in experience — no browser needed.
          </p>

          {/* iOS / Safari */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-brand-teal uppercase tracking-widest">
              iPhone / iPad (Safari)
            </p>
            <ol className="space-y-2 list-none">
              {[
                <>Open this site in <strong className="text-white font-semibold">Safari</strong> (not Chrome or another browser)</>,
                <>Tap the <strong className="text-white font-semibold">Share</strong> button at the bottom of the screen (box with an arrow pointing up)</>,
                <>Scroll down and tap <strong className="text-white font-semibold">Add to Home Screen</strong></>,
                <>Tap <strong className="text-white font-semibold">Add</strong> — the app icon will appear on your home screen</>,
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-brand-gray/80 leading-snug">
                  <span className="text-brand-teal font-bold shrink-0 w-4">{i + 1}.</span>
                  <span className="flex-1">{text}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Android / Chrome */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-brand-teal uppercase tracking-widest">
              Android (Chrome)
            </p>
            <ol className="space-y-2 list-none">
              {[
                <>Open this site in <strong className="text-white font-semibold">Chrome</strong></>,
                <>Tap the <strong className="text-white font-semibold">menu</strong> (three dots ⋮) in the top-right corner</>,
                <>Tap <strong className="text-white font-semibold">Add to Home screen</strong> or <strong className="text-white font-semibold">Install app</strong></>,
                <>Tap <strong className="text-white font-semibold">Add</strong> to confirm</>,
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-brand-gray/80 leading-snug">
                  <span className="text-brand-teal font-bold shrink-0 w-4">{i + 1}.</span>
                  <span className="flex-1">{text}</span>
                </li>
              ))}
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
