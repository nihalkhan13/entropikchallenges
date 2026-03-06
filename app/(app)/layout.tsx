"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { Loader2, LogOut, Shield } from "lucide-react"
import Link from "next/link"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, isLoading, signOut } = useAuth()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isLoading && !profile) {
      router.replace("/login")
    }
  }, [profile, isLoading, router])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Show spinner only while auth is actively loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-brand-teal animate-spin" />
      </div>
    )
  }

  // Auth resolved but no profile → redirect is in flight, render nothing so we don't flash a spinner
  if (!profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-brand-dark relative overflow-x-hidden">
      {/* Background Mesh */}
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-teal/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      <main className="max-w-md mx-auto min-h-screen flex flex-col p-4 pb-20">
        {/* Header */}
        <header className="flex items-center justify-between py-4 mb-6">
          <div className="flex items-center">
            <img src="/logo.png" alt="ENTROPIK" className="h-24 w-auto -ml-5" />
          </div>

          {/* Profile area with dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="text-right">
                <p className="text-[10px] text-brand-gray uppercase tracking-widest">Operator</p>
                <p className="text-sm font-medium text-brand-teal">{profile.display_name}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-brand-glass border border-brand-glass-border flex items-center justify-center text-xs font-bold text-white">
                {profile.display_name.charAt(0).toUpperCase()}
              </div>
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-[#1a1f26] border border-brand-glass-border rounded-xl shadow-xl overflow-hidden z-50">
                {profile.is_admin && (
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-xs text-brand-gray hover:bg-white/5 hover:text-brand-teal transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5 shrink-0" />
                    Admin Panel
                  </Link>
                )}
                <button
                  onClick={() => { setMenuOpen(false); signOut() }}
                  className="flex items-center gap-2.5 px-4 py-3 text-xs text-brand-gray hover:bg-white/5 hover:text-red-400 transition-colors w-full text-left border-t border-brand-glass-border/50"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        {children}
      </main>
    </div>
  )
}
