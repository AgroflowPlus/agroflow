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
      checkSubscription().then(async (alreadySubscribed) => {
        console.log('🔔 Already subscribed:', alreadySubscribed)
        
        // Auto-subscribe if running as installed PWA and not already subscribed
        const isPWA = window.matchMedia('(display-mode: standalone)').matches
        console.log('🔔 Is PWA:', isPWA)
        
        if (isPWA && !alreadySubscribed) {
          console.log('🔔 PWA detected — auto-subscribing...')
          // Small delay to let the user see the permission prompt
          setTimeout(() => {
            subscribe()
          }, 1000)
        }
      })
    }
  }, [])

  const checkSubscription = async (): Promise<boolean> => {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      const hasSubscription = !!sub
      console.log('🔔 Current subscription:', hasSubscription ? 'Active' : 'None')
      setIsSubscribed(hasSubscription)
      return hasSubscription
    } catch (error) {
      console.error('🔔 Check subscription error:', error)
      return false
    }
  }

  const subscribe = async (): Promise<boolean> => {
    if (!isSupported || !VAPID_PUBLIC_KEY) return false
    setIsLoading(true)

    // Safety timeout — stop spinning after 10 seconds no matter what
    const timeout = setTimeout(() => {
      console.log('🔔 Subscribe timeout after 10 seconds - resetting loading state')
      setIsLoading(false)
    }, 10000)

    try {
      const permission = await Notification.requestPermission()
      console.log('🔔 Notification permission:', permission)
      if (permission !== 'granted') {
        clearTimeout(timeout)
        setIsLoading(false)
        return false
      }

      const reg = await navigator.serviceWorker.ready
      console.log('🔔 SW ready, subscribing...')
      
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
      
      console.log('🔔 Server response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('🔔 Server error response:', errorText)
        clearTimeout(timeout)
        setIsLoading(false)
        return false
      }

      const responseData = await response.json()
      console.log('🔔 Server response data:', responseData)

      clearTimeout(timeout)
      setIsSubscribed(true)
      setIsLoading(false)
      return true
    } catch (err: any) {
      console.error('🔔 Subscribe failed:', err.message, err)
      clearTimeout(timeout)
      setIsLoading(false)
      return false
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
        const response = await fetch(`${BASE_URL}/push/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        console.log('🔔 Unsubscribe server response:', response.status)
        await sub.unsubscribe()
        setIsSubscribed(false)
        console.log('🔔 Unsubscribed successfully')
      } else {
        console.log('🔔 No active subscription to unsubscribe')
      }
    } catch (error) {
      console.error('🔔 Unsubscribe error:', error)
      if (error instanceof Error) {
        console.error('🔔 Error name:', error.name)
        console.error('🔔 Error message:', error.message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const sendTestNotification = async () => {
    console.log('🔔 Sending test notification...')
    try {
      const token = authService.getToken()
      if (!token) {
        console.error('🔔 No auth token available')
        throw new Error('Not authenticated')
      }
      
      const response = await fetch(`${BASE_URL}/push/test`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      })
      
      const data = await response.json()
      console.log('🔔 Test notification response:', data)
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test notification')
      }
      
      return data
    } catch (error) {
      console.error('🔔 Test notification error:', error)
      if (error instanceof Error) {
        console.error('🔔 Error name:', error.name)
        console.error('🔔 Error message:', error.message)
      }
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