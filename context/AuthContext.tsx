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
  const [session, setSession]   = useState<Session | null>(null)
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

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
  }

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        // Step 1: read local session from cookies
        const { data: { session: localSession } } = await supabase.auth.getSession()

        if (!localSession?.user) {
          // No session at all — unauthenticated, go to login
          if (!cancelled) setIsLoading(false)
          return
        }

        // Step 2: VERIFY the token is genuinely valid by hitting the Supabase API.
        // getSession() only reads cookies — it doesn't check if the token is expired
        // or from a different domain. getUser() makes a real API call to confirm.
        const { error: userError } = await supabase.auth.getUser()

        if (userError) {
          // Token is stale/invalid (e.g. leftover cookies from old Vercel preview URL).
          // Clear it so the user lands on a clean login page.
          console.warn("Stale session detected, signing out:", userError.message)
          await supabase.auth.signOut()
          if (!cancelled) setIsLoading(false)
          return
        }

        // Token is valid — load the profile
        if (!cancelled) {
          setSession(localSession)
          await fetchProfile(localSession.user.id)
          setIsLoading(false)
        }
      } catch (err) {
        console.error("Auth init error:", err)
        // On any unexpected error, clear the session and bail to login
        await supabase.auth.signOut()
        if (!cancelled) setIsLoading(false)
      }
    }

    // Safety timeout: if the whole init hangs (network issue), force-clear after 10s
    const timeout = setTimeout(async () => {
      console.warn("Auth init timeout — clearing session")
      await supabase.auth.signOut()
      if (!cancelled) setIsLoading(false)
    }, 10000)

    init().finally(() => clearTimeout(timeout))

    // Listen for sign-in / sign-out / token refresh events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (cancelled) return
        setSession(newSession)
        if (newSession?.user) {
          await fetchProfile(newSession.user.id)
        } else {
          setProfile(null)
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
