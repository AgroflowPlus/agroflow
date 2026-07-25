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
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null)

  useEffect(() => {
    // ── TEMPORARY DEBUG: Log all env vars ──
    console.log('🔔 All env vars:', import.meta.env)
    console.log('🔔 VITE_VAPID_PUBLIC_KEY:', import.meta.env.VITE_VAPID_PUBLIC_KEY)
    console.log('🔔 VITE_API_URL:', import.meta.env.VITE_API_URL)

    const supported = 'serviceWorker' in navigator && 'PushManager' in window
    console.log('🔔 Push supported:', supported)
    console.log('🔔 VAPID key present:', !!VAPID_PUBLIC_KEY)
    setIsSupported(supported)

    let mounted = true

    if (supported) {
      checkSubscription().then(async (alreadySubscribed) => {
        if (!mounted) return
        
        console.log('🔔 Already subscribed:', alreadySubscribed)
        
        // Auto-subscribe if running as installed PWA and not already subscribed
        const isPWA = window.matchMedia('(display-mode: standalone)').matches
        console.log('🔔 Is PWA:', isPWA)
        
        if (isPWA && !alreadySubscribed) {
          console.log('🔔 PWA detected — auto-subscribing...')
          // Small delay to let the user see the permission prompt
          setTimeout(() => {
            if (mounted) {
              subscribe()
            }
          }, 1000)
        }
      }).catch(error => {
        console.error('🔔 Error checking subscription:', error)
      })
    }

    // Listen for display-mode changes (user installs PWA while app is running)
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleDisplayChange = () => {
      if (mediaQuery.matches) {
        console.log('🔔 App switched to standalone mode (PWA installed)')
        checkSubscription().then((alreadySubscribed) => {
          if (!alreadySubscribed) {
            console.log('🔔 Auto-subscribing after PWA install...')
            subscribe()
          }
        })
      }
    }
    
    mediaQuery.addEventListener('change', handleDisplayChange)

    return () => {
      mounted = false
      mediaQuery.removeEventListener('change', handleDisplayChange)
    }
  }, [])

  const checkSubscription = async (): Promise<boolean> => {
    try {
      // Wait for service worker to be ready
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      const hasSubscription = !!sub
      console.log('🔔 Current subscription:', hasSubscription ? 'Active' : 'None')
      setIsSubscribed(hasSubscription)
      setSubscriptionError(null)
      return hasSubscription
    } catch (error) {
      console.error('🔔 Check subscription error:', error)
      setIsSubscribed(false)
      setSubscriptionError('Failed to check subscription status')
      return false
    }
  }

  const subscribe = async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('🔔 Push notifications not supported')
      setSubscriptionError('Push notifications not supported in this browser')
      return false
    }
    
    if (!VAPID_PUBLIC_KEY) {
      console.warn('🔔 VAPID public key not configured')
      setSubscriptionError('Push notifications not configured (missing VAPID key)')
      return false
    }

    setIsLoading(true)
    setSubscriptionError(null)

    // Safety timeout — stop spinning after 10 seconds no matter what
    let timeoutId: number | undefined = setTimeout(() => {
      console.log('🔔 Subscribe timeout after 10 seconds - resetting loading state')
      setIsLoading(false)
      setSubscriptionError('Subscription timed out - please try again')
    }, 10000)

    try {
      // Request permission
      const permission = await Notification.requestPermission()
      console.log('🔔 Notification permission:', permission)
      
      if (permission !== 'granted') {
        clearTimeout(timeoutId)
        setIsLoading(false)
        setSubscriptionError('Notification permission denied')
        return false
      }

      // Wait for service worker
      const reg = await navigator.serviceWorker.ready
      console.log('🔔 SW ready, subscribing...')
      
      // Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      console.log('🔔 Subscribed successfully:', sub.endpoint)

      // Send to server
      const token = authService.getToken()
      if (!token) {
        clearTimeout(timeoutId)
        setIsLoading(false)
        setSubscriptionError('Not authenticated')
        return false
      }

      const response = await fetch(`${BASE_URL}/push/subscribe`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(sub.toJSON()),
      })
      
      console.log('🔔 Server response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('🔔 Server error response:', errorText)
        clearTimeout(timeoutId)
        setIsLoading(false)
        setSubscriptionError(`Server error: ${response.status} ${errorText}`)
        return false
      }

      const responseData = await response.json()
      console.log('🔔 Server response data:', responseData)

      clearTimeout(timeoutId)
      setIsSubscribed(true)
      setIsLoading(false)
      setSubscriptionError(null)
      return true
    } catch (err: any) {
      console.error('🔔 Subscribe failed:', err.message, err)
      clearTimeout(timeoutId)
      setIsLoading(false)
      setSubscriptionError(err.message || 'Subscription failed')
      return false
    }
  }

  const unsubscribe = async () => {
    console.log('🔔 Unsubscribe called')
    setIsLoading(true)
    setSubscriptionError(null)
    
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      
      if (sub) {
        console.log('🔔 Unsubscribing from:', sub.endpoint)
        
        // Unsubscribe from server
        const token = authService.getToken()
        if (token) {
          const response = await fetch(`${BASE_URL}/push/unsubscribe`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
          console.log('🔔 Unsubscribe server response:', response.status)
        }
        
        // Unsubscribe from push manager
        await sub.unsubscribe()
        setIsSubscribed(false)
        console.log('🔔 Unsubscribed successfully')
      } else {
        console.log('🔔 No active subscription to unsubscribe')
        setIsSubscribed(false)
      }
    } catch (error) {
      console.error('🔔 Unsubscribe error:', error)
      if (error instanceof Error) {
        console.error('🔔 Error name:', error.name)
        console.error('🔔 Error message:', error.message)
        setSubscriptionError(error.message)
      } else {
        setSubscriptionError('Failed to unsubscribe')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isSubscribed,
    isSupported,
    isLoading,
    subscriptionError,
    subscribe,
    unsubscribe,
    checkSubscription,
  }
}