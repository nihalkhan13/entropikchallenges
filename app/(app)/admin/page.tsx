"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { useRouter } from "next/navigation"
import { invalidateChallengeConfigCache } from "@/lib/challenge"

type UserRow = {
  id: string
  display_name: string
  is_admin: boolean
  created_at: string
  email?: string
}

export default function AdminPage() {
  const { profile, isLoading } = useAuth()
  const router = useRouter()

  const [users, setUsers] = useState<UserRow[]>([])
  const [startDate, setStartDate] = useState("")
  const [durationDays, setDurationDays] = useState("")
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading) {
      if (!profile || !profile.is_admin) {
        router.replace("/dashboard")
        return
      }
      fetchData()
    }
  }, [profile, isLoading])

  const fetchData = async () => {
    // Fetch profiles + challenge settings in parallel; also fetch emails via admin API
    const [{ data: usersData }, { data: settings }, emailsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("challenge_settings").select("key, value"),
      fetch("/api/admin/users"),
    ])

    // Build a map of id → email from the admin API
    let emailMap: Record<string, string> = {}
    if (emailsRes.ok) {
      const { users: authUsers } = await emailsRes.json() as { users: { id: string; email: string }[] }
      for (const u of authUsers) emailMap[u.id] = u.email
    }

    if (usersData) {
      setUsers(usersData.map((u: any) => ({ ...u, email: emailMap[u.id] ?? "" })))
    }
    if (settings) {
      const map: Record<string, string> = {}
      for (const row of settings) map[row.key] = row.value
      setStartDate(map["start_date"] ?? "")
      setDurationDays(map["duration_days"] ?? "")
    }
  }

  // ─── Save settings via service-role API route ────────────────────────────
  const handleSaveSettings = async () => {
    if (!startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      setSettingsMsg({ type: "err", text: "Date must be YYYY-MM-DD format" })
      return
    }
    const days = Number(durationDays)
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      setSettingsMsg({ type: "err", text: "Duration must be between 1 and 365 days" })
      return
    }

    setSettingsSaving(true)
    setSettingsMsg(null)

    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "start_date", value: startDate }),
        }),
        fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "duration_days", value: String(days) }),
        }),
      ])

      const err1 = r1.ok ? null : (await r1.json()).error
      const err2 = r2.ok ? null : (await r2.json()).error

      if (err1 || err2) {
        setSettingsMsg({ type: "err", text: err1 ?? err2 })
      } else {
        invalidateChallengeConfigCache()
        setSettingsMsg({ type: "ok", text: "✓ Settings saved — changes take effect immediately" })
      }
    } catch (e: any) {
      setSettingsMsg({ type: "err", text: e.message ?? "Network error" })
    } finally {
      setSettingsSaving(false)
    }
  }

  // ─── Delete user via service-role API route ──────────────────────────────
  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}"?\n\nThis permanently deletes their account and all check-in history. This cannot be undone.`)) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const { error } = await res.json()
        alert(`Failed to remove user: ${error}`)
      } else {
        await fetchData()
      }
    } catch (e: any) {
      alert(`Network error: ${e.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  // ─── Export CSV ───────────────────────────────────────────────────────────
  const exportCSV = async () => {
    const { data: checkins } = await supabase
      .from("checkins")
      .select("*, profile:profiles(display_name)")
    if (!checkins) return

    const header = "display_name,date,duration_seconds,created_at\n"
    const rows = checkins
      .map((c: any) => `${(c.profile as any)?.display_name ?? ""},${c.date},${c.duration_seconds ?? ""},${c.created_at}`)
      .join("\n")
    const blob = new Blob([header + rows], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "plank_challenge_checkins.csv"
    a.click()
  }

  if (isLoading) return null

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Admin Control</h1>

      {/* ── Challenge Settings ── */}
      <Card>
        <h2 className="text-lg font-bold text-white mb-4">Challenge Settings</h2>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-brand-gray uppercase tracking-widest">Start Date</label>
            <Input
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setSettingsMsg(null) }}
              placeholder="YYYY-MM-DD (e.g. 2026-03-13)"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-brand-gray uppercase tracking-widest">Duration (days)</label>
            <Input
              type="number"
              value={durationDays}
              onChange={(e) => { setDurationDays(e.target.value); setSettingsMsg(null) }}
              placeholder="e.g. 30"
              min={1}
              max={365}
            />
          </div>

          {settingsMsg && (
            <p className={`text-xs px-1 ${settingsMsg.type === "ok" ? "text-brand-teal" : "text-red-400"}`}>
              {settingsMsg.text}
            </p>
          )}

          <Button
            onClick={handleSaveSettings}
            variant="secondary"
            disabled={settingsSaving}
          >
            {settingsSaving ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      </Card>

      {/* ── Participants ── */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white">Participants ({users.length})</h2>
          <Button onClick={exportCSV} size="sm" variant="glass">Export CSV</Button>
        </div>

        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex justify-between items-start p-3 bg-white/5 rounded-xl gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-200 truncate">
                    {u.display_name}
                  </span>
                  {u.is_admin && (
                    <span className="text-[10px] text-brand-teal uppercase tracking-widest shrink-0">admin</span>
                  )}
                </div>
                {u.email && (
                  <p className="text-[11px] text-brand-gray/50 truncate mt-0.5">{u.email}</p>
                )}
              </div>
              <Button
                onClick={() => handleDeleteUser(u.id, u.display_name)}
                variant="danger"
                size="sm"
                className="h-8 text-xs shrink-0"
                disabled={deletingId === u.id || u.id === profile?.id}
              >
                {deletingId === u.id ? "Removing…" : u.id === profile?.id ? "You" : "Remove"}
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
