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
  const [isSubscribed,  setIsSubscribed]  = useState(false)
  const [isSupported,   setIsSupported]   = useState(false)
  const [isLoading,     setIsLoading]     = useState(false)

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window)
    checkSubscription()
  }, [])

  const checkSubscription = async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setIsSubscribed(!!sub)
    } catch { /* not supported */ }
  }

  const subscribe = async (): Promise<boolean> => {
    if (!isSupported || !VAPID_PUBLIC_KEY) return false
    setIsLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return false

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const token = authService.getToken()
      await fetch(`${BASE_URL}/push/subscribe`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(sub.toJSON()),
      })

      setIsSubscribed(true)
      return true
    } catch (err) {
      console.error('Subscribe error:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const unsubscribe = async () => {
    setIsLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const token = authService.getToken()
        await fetch(`${BASE_URL}/push/unsubscribe`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body:    JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
        setIsSubscribed(false)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const sendTestNotification = async () => {
    const token = authService.getToken()
    await fetch(`${BASE_URL}/push/test`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  }

  return { isSubscribed, isSupported, isLoading, subscribe, unsubscribe, sendTestNotification }
}