"use client"

import { useEffect, ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'

declare global {
  interface Window {
    OneSignal: any
  }
}

export function OneSignalProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()

  useEffect(() => {
    // Inject OneSignal Script
    const script = document.createElement('script')
    script.src = 'https://cdn.onesignal.com/sdks/OneSignalSDK.js'
    script.async = true
    document.head.appendChild(script)

    window.OneSignal = window.OneSignal || []

    window.OneSignal.push(function () {
      window.OneSignal.init({
        appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ?? '',
        notifyButton: { enable: false },
        allowLocalhostAsSecureOrigin: true,
      })
    })

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  useEffect(() => {
    if (profile && window.OneSignal) {
      window.OneSignal.push(async function () {
        const userId = await window.OneSignal.getUserId()
        if (userId) {
          await supabase
            .from('profiles')
            .update({
              notification_settings: {
                ...profile.notification_settings,
                push_token: userId,
              },
            })
            .eq('id', profile.id)
        }
      })
    }
  }, [profile])

  return <>{children}</>
}
