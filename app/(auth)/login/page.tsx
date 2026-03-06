"use client"

import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton"
import { CHALLENGE_COPY } from "@/lib/constants"

export default function LoginPage() {
  const searchParams = useSearchParams()
  const authError = searchParams.get("error")

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-teal/10 rounded-full blur-[100px] animate-pulse-slow" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-sm z-10 space-y-8"
      >
        {/* Logo + title */}
        <div className="text-center flex flex-col items-center">
          <img src="/logo.png" alt="ENTROPIK" className="h-32 w-auto mb-4" />
          <h1 className="text-white font-bold text-2xl tracking-tight">
            {CHALLENGE_COPY.APP_TITLE}
          </h1>
          <p className="text-brand-gray text-xs tracking-widest uppercase font-semibold mt-1">
            {CHALLENGE_COPY.APP_TAGLINE}
          </p>
        </div>

        {/* Sign-in card */}
        <div className="bg-brand-glass border border-brand-glass-border rounded-2xl p-6 space-y-5">
          <div className="space-y-1">
            <p className="text-white font-semibold text-sm">Sign in to join</p>
            <p className="text-brand-gray/70 text-xs leading-relaxed">
              Your Google account is used only to identify you in the challenge.
              No posting is done on your behalf.
            </p>
          </div>

          {authError && (
            <p className="text-sm text-brand-error px-1">
              Sign-in failed. Please try again.
            </p>
          )}

          <GoogleSignInButton />
        </div>

        <p className="text-center text-brand-gray/40 text-xs">
          BY SIGNING IN YOU ACCEPT THE CHALLENGE TERMS
        </p>
      </motion.div>
    </div>
  )
}
