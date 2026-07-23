import { useState, useEffect } from 'react'
import { authService } from '../services/authService'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; i++) {
    view[i] = rawData.charCodeAt(i)
  }
  return view
}

export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // ── TEMPORARY DEBUG: Log all env vars ──
    console.log('🔔 All env vars:', import.meta.env)
    console.log('🔔 VITE_VAPID_PUBLIC_KEY:', import.meta.env.VITE_VAPID_PUBLIC_KEY)
    console.log('🔔 VITE_API_URL:', import.meta.env.VITE_API_URL)

    const supported = 'serviceWorker' in navigator && 'PushManager' in window
    console.log('🔔 Push supported:', supported)
    console.log('🔔 VAPID key present:', !!VAPID_PUBLIC_KEY)
    setIsSupported(supported)

    if (supported) {
      checkSubscription().then(() => {
        // Auto-subscribe if running as PWA and not already subscribed
        const isPWA = window.matchMedia('(display-mode: standalone)').matches
        console.log('🔔 Is PWA:', isPWA)
        
        if (isPWA) {
          navigator.serviceWorker.ready.then(async (reg) => {
            const existing = await reg.pushManager.getSubscription()
            console.log('🔔 Existing subscription:', existing ? 'Yes' : 'No')
            if (!existing) {
              console.log('🔔 Auto-subscribing for PWA...')
              // Small delay to let the user see the permission prompt
              setTimeout(() => {
                subscribe()
              }, 1000)
            }
          })
        }
      })
    }
  }, [])

  const checkSubscription = async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      console.log('🔔 Current subscription:', sub ? 'Active' : 'None')
      setIsSubscribed(!!sub)
      return sub
    } catch (error) {
      console.error('🔔 Check subscription error:', error)
      return null
    }
  }

  const subscribe = async (): Promise<boolean> => {
    console.log('🔔 Subscribe called - isSupported:', isSupported, 'VAPID key:', !!VAPID_PUBLIC_KEY)
    if (!isSupported || !VAPID_PUBLIC_KEY) {
      console.error('🔔 Cannot subscribe - not supported or missing VAPID key')
      return false
    }
    setIsLoading(true)
    try {
      const permission = await Notification.requestPermission()
      console.log('🔔 Notification permission:', permission)
      if (permission !== 'granted') {
        console.error('🔔 Permission denied')
        return false
      }

      const reg = await navigator.serviceWorker.ready
      console.log('🔔 Service worker ready:', !!reg)

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      console.log('🔔 Subscribed successfully:', sub.endpoint)

      const token = authService.getToken()
      const response = await fetch(`${BASE_URL}/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(sub.toJSON()),
      })

      if (!response.ok) {
        throw new Error('Failed to save subscription to backend')
      }

      setIsSubscribed(true)
      return true
    } catch (err) {
      console.error('🔔 Subscribe error:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const unsubscribe = async () => {
    console.log('🔔 Unsubscribe called')
    setIsLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        console.log('🔔 Unsubscribing from:', sub.endpoint)
        const token = authService.getToken()
        await fetch(`${BASE_URL}/push/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
        setIsSubscribed(false)
        console.log('🔔 Unsubscribed successfully')
      }
    } catch (error) {
      console.error('🔔 Unsubscribe error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendTestNotification = async () => {
    console.log('🔔 Sending test notification...')
    try {
      const token = authService.getToken()
      const response = await fetch(`${BASE_URL}/push/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      console.log('🔔 Test notification response:', data)
      return data
    } catch (error) {
      console.error('🔔 Test notification error:', error)
      throw error
    }
  }

  return {
    isSubscribed,
    isSupported,
    isLoading,
    subscribe,
    unsubscribe,
    sendTestNotification,
  }
}