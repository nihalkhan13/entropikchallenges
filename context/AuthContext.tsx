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
const AUTH_TIMEOUT_MS = 8000
// Maximum ms to wait for a single Supabase DB query.
const QUERY_TIMEOUT_MS = 10000

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession]     = useState<Session | null>(null)
  const [profile, setProfile]     = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const fetchingRef = useRef(false)

  /**
   * Race a promise against a timeout so no Supabase call hangs forever.
   */
  function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
      ),
    ]) as Promise<T>
  }

  /**
   * Fetch (or auto-create) the profile row for a given user.
   * Every Supabase DB call is wrapped in a timeout so nothing hangs.
   */
  const fetchProfile = async (user: User) => {
    if (fetchingRef.current) return
    fetchingRef.current = true

    console.log("fetchProfile: starting for", user.email, "id:", user.id)

    try {
      const { data, error } = await withTimeout(
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single(),
        QUERY_TIMEOUT_MS,
        "profiles SELECT"
      )

      console.log("fetchProfile: query returned", {
        hasData: !!data,
        errorCode: (error as any)?.code ?? "none",
        errorMsg: (error as any)?.message ?? "",
      })

      if (!error && data) {
        setProfile(data as Profile)
        return
      }

      // PGRST116 = 0 rows — profile doesn't exist yet, auto-create it.
      if ((error as any)?.code === "PGRST116" || (error as any)?.details?.includes("0 rows")) {
        console.log("fetchProfile: no profile row found — auto-creating")
        const displayName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "User"

        const { data: newProfile, error: insertError } = await withTimeout(
          supabase
            .from("profiles")
            .insert({ id: user.id, display_name: displayName })
            .select()
            .single(),
          QUERY_TIMEOUT_MS,
          "profiles INSERT"
        )

        if (!insertError && newProfile) {
          console.log("fetchProfile: created profile for", displayName)
          setProfile(newProfile as Profile)
        } else {
          console.error("fetchProfile: INSERT failed:", (insertError as any)?.message || (insertError as any)?.code)
        }
        return
      }

      console.error("fetchProfile: SELECT error:", (error as any)?.message || (error as any)?.code)
    } catch (err) {
      // This catches timeouts and network errors
      console.error("fetchProfile: threw (likely timeout or network error):", err)
    } finally {
      fetchingRef.current = false
    }
  }

  useEffect(() => {
    let cancelled = false

    // Safety net: if auth doesn't resolve within AUTH_TIMEOUT_MS, clear loading.
    const timeout = setTimeout(() => {
      if (!cancelled) {
        console.warn("AuthContext: auth timed out after", AUTH_TIMEOUT_MS, "ms")
        setIsLoading(false)
      }
    }, AUTH_TIMEOUT_MS)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (cancelled) return

        console.log("AuthContext: auth event →", event, "user:", newSession?.user?.email ?? "none")

        setSession(newSession)

        // ── KEY FIX: clear isLoading IMMEDIATELY once auth state is known. ──
        // Profile fetching happens in the background and updates via setProfile.
        // The layout uses `session` (not `profile`) to decide authentication.
        clearTimeout(timeout)
        setIsLoading(false)

        if (newSession?.user) {
          // Fire-and-forget — profile loads async, triggers re-render when done
          fetchProfile(newSession.user)
        } else {
          setProfile(null)
          fetchingRef.current = false
        }
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
      fetchingRef.current = false
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
