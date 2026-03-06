"use client"

import React, { createContext, useContext, useEffect, useRef, useState } from "react"
import { Session, User } from "@supabase/supabase-js"
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

// Maximum ms to wait for auth before clearing the loading state.
// Prevents an infinite spinner if Supabase is slow or unreachable.
const AUTH_TIMEOUT_MS = 6000

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession]     = useState<Session | null>(null)
  const [profile, setProfile]     = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  // Track whether a fetchProfile is already in-flight to avoid parallel calls
  // (onAuthStateChange INITIAL_SESSION and getSession can both fire on mount)
  const fetchingRef = useRef(false)

  /**
   * Fetch (or auto-create) the profile row for a given user.
   *
   * Accepts the Supabase User object directly so we never need to call
   * supabase.auth.getUser() again inside here — that extra round-trip was
   * the main cause of the infinite loading spinner on first-time sign-ins.
   */
  const fetchProfile = async (user: User) => {
    // Deduplicate: skip if a fetch is already in-flight
    if (fetchingRef.current) return
    fetchingRef.current = true

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (!error) {
        setProfile(data as Profile)
        return
      }

      // PGRST116 = 0 rows — profile doesn't exist yet (DB trigger may not have run).
      // Build the display name from the user metadata we already have — no extra
      // network call to getUser() needed.
      if ((error as any).code === "PGRST116" || (error as any).details?.includes("0 rows")) {
        const displayName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "User"

        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({ id: user.id, display_name: displayName })
          .select()
          .single()

        if (!insertError) {
          setProfile(newProfile as Profile)
        } else {
          console.error("fetchProfile insert error:", insertError.message || insertError.code)
        }
        return
      }

      console.error("fetchProfile select error:", error.message || error.code)
    } catch (err) {
      console.error("fetchProfile threw:", err)
    } finally {
      fetchingRef.current = false
    }
  }

  useEffect(() => {
    let cancelled = false

    // Safety net: if auth doesn't resolve within AUTH_TIMEOUT_MS, clear loading
    // so the user is never permanently stuck on the spinner.
    const timeout = setTimeout(() => {
      if (!cancelled) {
        console.warn("AuthContext: auth timed out after", AUTH_TIMEOUT_MS, "ms — clearing loading state")
        setIsLoading(false)
      }
    }, AUTH_TIMEOUT_MS)

    // onAuthStateChange is the single source of truth for auth state.
    // It fires INITIAL_SESSION synchronously-ish on mount with the session
    // that @supabase/ssr read from cookies — no separate getSession() call needed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (cancelled) return

        console.log("AuthContext: auth event →", event, "user:", newSession?.user?.email ?? "none")

        setSession(newSession)

        if (newSession?.user) {
          await fetchProfile(newSession.user)
        } else {
          setProfile(null)
          fetchingRef.current = false
        }

        clearTimeout(timeout)
        setIsLoading(false)
      }
    )

    return () => {
      cancelled = true
      clearTimeout(timeout)
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
    if (session?.user) {
      fetchingRef.current = false  // allow a fresh fetch
      await fetchProfile(session.user)
    }
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
