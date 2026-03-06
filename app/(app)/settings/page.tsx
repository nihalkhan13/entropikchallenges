"use client"

import { useState, useEffect } from "react"
import { Bell, Shield, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase/client"
import Link from "next/link"
import { cn } from "@/lib/utils"

declare global {
  interface Window {
    OneSignal: any
  }
}

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)

  useEffect(() => {
    if (window.OneSignal) {
      window.OneSignal.push(async function () {
        const isPushEnabled = await window.OneSignal.isPushNotificationsEnabled()
        setPushEnabled(isPushEnabled)
      })
    }
  }, [])

  const toggleNotifications = async () => {
    if (!window.OneSignal) return

    setLoading(true)
    try {
      if (pushEnabled) {
        setPushEnabled(false)
      } else {
        await window.OneSignal.showNativePrompt()
        const isEnabled = await window.OneSignal.isPushNotificationsEnabled()
        setPushEnabled(isEnabled)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updatePreference = async (key: string, value: boolean) => {
    if (!profile) return
    const newSettings = { ...profile.notification_settings, [key]: value }
    await supabase
      .from('profiles')
      .update({ notification_settings: newSettings })
      .eq('id', profile.id)
    await refreshProfile()
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard">
          <button className="w-10 h-10 rounded-full bg-brand-glass flex items-center justify-center hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5 text-brand-gray" />
          </button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      <Card className="p-6 space-y-8 bg-brand-glass/40">
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-brand-teal mb-2">
            <Bell className="w-5 h-5" />
            <h2 className="font-bold text-sm uppercase tracking-wider">Push Notifications</h2>
          </div>

          <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-white">Device Permissions</p>
              <p className="text-xs text-brand-gray/60">Allow system notifications</p>
            </div>
            <Button
              variant={pushEnabled ? "secondary" : "primary"}
              size="sm"
              className="h-8 px-4 text-[10px]"
              onClick={toggleNotifications}
              disabled={loading}
            >
              {pushEnabled ? "ENABLED" : "ENABLE"}
            </Button>
          </div>

          <div className="space-y-4 pt-2">
            <PreferenceToggle
              label="Daily Reminders"
              description="Don't lose your streak"
              enabled={profile?.notification_settings?.reminders !== false}
              onChange={(val) => updatePreference('reminders', val)}
            />
            <PreferenceToggle
              label="Squad Pulse"
              description="When teammates check in"
              enabled={profile?.notification_settings?.social !== false}
              onChange={(val) => updatePreference('social', val)}
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-brand-gray mb-2">
            <Shield className="w-5 h-5" />
            <h2 className="font-bold text-sm uppercase tracking-wider">Privacy</h2>
          </div>
          <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5 opacity-50 cursor-not-allowed">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-white">Incognito Mode</p>
              <p className="text-xs text-brand-gray/60">Hide check-ins from squad</p>
            </div>
            <div className="w-10 h-5 bg-white/10 rounded-full relative">
              <div className="absolute left-1 top-1 w-3 h-3 bg-white/20 rounded-full" />
            </div>
          </div>
        </section>
      </Card>

      <div className="text-center pt-4">
        <p className="text-[10px] text-brand-gray/30 uppercase tracking-[0.2em] font-bold">
          Entropik Engine v2.0
        </p>
      </div>
    </div>
  )
}

function PreferenceToggle({ label, description, enabled, onChange }: {
  label: string
  description: string
  enabled: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-brand-gray/60">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={cn(
          "w-12 h-6 rounded-full transition-colors relative",
          enabled ? "bg-brand-teal" : "bg-white/10"
        )}
      >
        <div className={cn(
          "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
          enabled ? "left-7" : "left-1"
        )} />
      </button>
    </div>
  )
}
