"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { Session } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"

interface AuthContextType {
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession]     = useState<Session | null>(null)
  const [profile, setProfile]     = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()

      if (!error) {
        setProfile(data as Profile)
        return
      }

      // PGRST116 = no rows — profile doesn't exist yet, create it
      if ((error as any).code === "PGRST116" || (error as any).details?.includes("0 rows")) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const displayName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "User"
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({ id: userId, display_name: displayName })
          .select()
          .single()
        if (!insertError) setProfile(newProfile as Profile)
        return
      }

      console.error("fetchProfile error:", error.message || error.code)
    } catch (err) {
      console.error("fetchProfile threw:", err)
    }
  }

  useEffect(() => {
    let cancelled = false

    // getSession() reads the cookie that middleware refreshed on every request.
    // Because middleware runs first, this cookie is always fresh on protected pages.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return
      setSession(session)
      if (session?.user) {
        await fetchProfile(session.user.id)
      }
      setIsLoading(false)
    }).catch(() => {
      if (!cancelled) setIsLoading(false)
    })

    // Keep session state in sync with token refreshes and sign-outs
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (cancelled) return
        setSession(newSession)
        if (newSession?.user) {
          await fetchProfile(newSession.user.id)
        } else {
          setProfile(null)
        }
        // Ensure loading clears on first auth event too
        setIsLoading(false)
      }
    )

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = async () => {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== "undefined" ? window.location.origin : "")
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${appUrl}/auth/callback` },
    })
    if (error) console.error("Google sign-in error:", error)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    router.push("/")
  }

  const refreshProfile = async () => {
    if (session?.user) await fetchProfile(session.user.id)
  }

  return (
    <AuthContext.Provider value={{ session, profile, isLoading, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
