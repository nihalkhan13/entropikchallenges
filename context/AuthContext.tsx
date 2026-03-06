"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { Session, User as AuthUser } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"

interface AuthContextType {
  /** Supabase Auth session (null when unauthenticated) */
  session: Session | null
  /** The user's profile row from public.profiles */
  profile: Profile | null
  /** True while the initial session check is in-flight */
  isLoading: boolean
  /** Redirect to Google OAuth; returns to /auth/callback */
  signInWithGoogle: () => Promise<void>
  /** Sign out and redirect to landing page */
  signOut: () => Promise<void>
  /** Refresh the profile row (e.g., after updating notification settings) */
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Fetch (or lazily create) the profile row for the currently authenticated user.
  // The DB trigger handles new sign-ups automatically, but if a user existed in
  // auth.users before migrations were run they won't have a profile row yet.
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (!error) {
      setProfile(data as Profile)
      return
    }

    // PGRST116 = "no rows returned" — profile doesn't exist yet, create it.
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
      if (insertError) {
        console.error("Failed to create profile:", insertError.message, insertError.code)
        return
      }
      setProfile(newProfile as Profile)
      return
    }

    console.error("Error fetching profile:", error.message || error.code || JSON.stringify(error))
  }

  useEffect(() => {
    // Safety net: if Supabase is slow (e.g. free-tier cold start), never hang forever
    const loadingTimeout = setTimeout(() => setIsLoading(false), 8000)

    // 1. Get the initial session on mount
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(loadingTimeout)
        setSession(session)
        if (session?.user) {
          fetchProfile(session.user.id).finally(() => setIsLoading(false))
        } else {
          setIsLoading(false)
        }
      })
      .catch(() => {
        clearTimeout(loadingTimeout)
        setIsLoading(false)
      })

    // 2. Subscribe to auth state changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        await fetchProfile(newSession.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      clearTimeout(loadingTimeout)
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = async () => {
    // Use the explicit env var if set; otherwise fall back to the browser's current origin.
    // This ensures the redirect URL is always a full absolute URL (required by Google OAuth).
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== "undefined" ? window.location.origin : "")
    const redirectTo = `${appUrl}/auth/callback`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
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
    <AuthContext.Provider
      value={{ session, profile, isLoading, signInWithGoogle, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
