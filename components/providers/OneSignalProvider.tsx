"use client"

import { useEffect, ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'

declare global {
  interface Window {
    OneSignal: any
    OneSignalDeferred: any[]
  }
}

export function OneSignalProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()

  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
    if (!appId) {
      console.warn('OneSignal: NEXT_PUBLIC_ONESIGNAL_APP_ID is not set — push notifications disabled.')
      return
    }

    // Use the deferred queue pattern so SDK calls are safe before the script loads
    window.OneSignalDeferred = window.OneSignalDeferred || []

    // Inject OneSignal SDK v16
    const script = document.createElement('script')
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
    script.defer = true
    document.head.appendChild(script)

    window.OneSignalDeferred.push(async function (OneSignal: any) {
      await OneSignal.init({
        appId,
        notifyButton: { enable: false },
        allowLocalhostAsSecureOrigin: true,
      })
    })

    return () => {
      if (document.head.contains(script)) document.head.removeChild(script)
    }
  }, [])

  // Once the profile is loaded, register the subscription ID in Supabase
  useEffect(() => {
    if (!profile) return

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
    if (!appId) return

    window.OneSignalDeferred = window.OneSignalDeferred || []
    window.OneSignalDeferred.push(async function (OneSignal: any) {
      try {
        // Request permission (no-op if already granted or denied)
        await OneSignal.Notifications.requestPermission()

        // Get the OneSignal subscription ID (player ID in v16)
        const subscriptionId = await OneSignal.User.PushSubscription.id

        if (subscriptionId) {
          await supabase
            .from('profiles')
            .update({
              notification_settings: {
                ...(profile.notification_settings ?? {}),
                reminders: profile.notification_settings?.reminders ?? true,
                social: profile.notification_settings?.social ?? true,
                push_token: subscriptionId,
              },
            })
            .eq('id', profile.id)
        }
      } catch (err) {
        console.warn('OneSignal subscription registration failed:', err)
      }
    })
  }, [profile?.id])

  return <>{children}</>
}
