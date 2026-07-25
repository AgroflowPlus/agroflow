import webpush from 'web-push'
import prisma from '../db/index'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export interface NotificationPayload {
  title:  string
  body:   string
  icon?:  string
  badge?: string
  url?:   string
  tag?:   string
  data?:  any
}

// Send to one user
export async function sendNotificationToUser(
  userId: string,
  payload: NotificationPayload,
) {
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { userId } })
    if (!subs.length) return

    const message = JSON.stringify({
      title:  payload.title,
      body:   payload.body,
      icon:   payload.icon  || '/icons/icon-192x192.png',
      badge:  payload.badge || '/icons/badge-72x72.png',
      url:    payload.url   || '/',
      tag:    payload.tag   || 'agroflow',
      data:   payload.data  || {},
      // Add a unique ID for the notification
      id:     `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    })

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            message,
          )
        } catch (err: any) {
          // Subscription expired — remove it
          if (err.statusCode === 404 || err.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } })
            console.log(`🗑️ Removed expired subscription for user ${userId}`)
          } else {
            console.error(`Push notification failed for user ${userId}:`, err.message)
          }
        }
      })
    )
  } catch (err) {
    console.error('Push notification error:', err)
  }
}

// Send to multiple users
export async function sendNotificationToUsers(
  userIds: string[],
  payload: NotificationPayload,
) {
  if (!userIds.length) return
  console.log(`📬 Sending push notification to ${userIds.length} users: ${payload.title}`)
  await Promise.allSettled(userIds.map(id => sendNotificationToUser(id, payload)))
}

// ── NOTIFICATION TEMPLATES ────────────────────────────────────

export async function notifyNewListing(buyerUserIds: string[], cropType: string, location: string) {
  await sendNotificationToUsers(buyerUserIds, {
    title: `🌾 New ${cropType} Available!`,
    body:  `Fresh ${cropType} just listed in ${location}. Tap to view.`,
    url:   '/buyer/dashboard',
    tag:   'new-listing',
    data:  { type: 'new_listing', cropType, location }
  })
}

export async function notifyOrderStatusUpdate(buyerUserId: string, status: string, cropType: string) {
  const statusMessages: Record<string, string> = {
    placed:             'Your order has been placed successfully!',
    accepted:           'Your order has been accepted by the seller!',
    preparing:          'Seller is preparing your produce.',
    transport_assigned: 'Transport has been assigned for your order.',
    in_transit:         'Your produce is on the way! 🚚',
    delivered:          'Your produce has been delivered. Please confirm receipt.',
    completed:          '✅ Order completed successfully!',
    cancelled:          '❌ Your order has been cancelled.',
  }

  const statusEmojis: Record<string, string> = {
    placed:             '📋',
    accepted:           '✅',
    preparing:          '👨‍🌾',
    transport_assigned: '🚚',
    in_transit:         '🚛',
    delivered:          '📦',
    completed:          '⭐',
    cancelled:          '❌',
  }

  await sendNotificationToUser(buyerUserId, {
    title: `${statusEmojis[status] || '📦'} Order Update — ${cropType}`,
    body:  statusMessages[status] || `Order status: ${status}`,
    url:   '/buyer/dashboard',
    tag:   `order-update-${buyerUserId}`,
    data:  { type: 'order_update', status, cropType }
  })
}

export async function notifyNewRequest(sellerUserId: string, cropType: string, quantity: number) {
  await sendNotificationToUser(sellerUserId, {
    title: '🛒 New Buy Request!',
    body:  `Someone wants to buy ${quantity}kg of your ${cropType}. Tap to respond.`,
    url:   '/seller/dashboard',
    tag:   'new-request',
    data:  { type: 'new_request', cropType, quantity }
  })
}

export async function notifyNewMatch(userIds: string[], cropType: string) {
  await sendNotificationToUsers(userIds, {
    title: '🤝 New Match Found!',
    body:  `A match has been found for ${cropType}. Tap to view details.`,
    url:   '/buyer/dashboard',
    tag:   'new-match',
    data:  { type: 'new_match', cropType }
  })
}

// ── NOTIFY WHEN ORDER IS CANCELLED (seller) ──────────────────────
export async function notifyOrderCancelledToSeller(
  sellerUserId: string, 
  cropType: string, 
  quantity: number
) {
  await sendNotificationToUser(sellerUserId, {
    title: '❌ Order Cancelled',
    body:  `A buyer has cancelled their order for ${quantity}kg of ${cropType}.`,
    url:   '/seller/dashboard',
    tag:   'order-cancelled',
    data:  { type: 'order_cancelled', cropType, quantity }
  })
}

// ── NOTIFY WHEN ORDER IS DELIVERED (seller) ──────────────────────
export async function notifyDeliveryConfirmedToSeller(
  sellerUserId: string, 
  cropType: string
) {
  await sendNotificationToUser(sellerUserId, {
    title: '✅ Delivery Confirmed!',
    body:  `The buyer has confirmed delivery of ${cropType}.`,
    url:   '/seller/dashboard',
    tag:   'delivery-confirmed',
    data:  { type: 'delivery_confirmed', cropType }
  })
}

// ── NOTIFY BUYER WHEN THEIR DEMAND IS MATCHED ────────────────────
export async function notifyDemandMatched(
  buyerUserId: string, 
  cropType: string, 
  sellerName: string
) {
  await sendNotificationToUser(buyerUserId, {
    title: '🎯 Demand Matched!',
    body:  `${sellerName} has produce matching your demand for ${cropType}.`,
    url:   '/buyer/dashboard',
    tag:   'demand-matched',
    data:  { type: 'demand_matched', cropType, sellerName }
  })
}

// ── NOTIFY SELLER WHEN LISTING IS NEARLY SOLD OUT ────────────────
export async function notifyLowStock(
  sellerUserId: string, 
  cropType: string, 
  remainingQty: number
) {
  await sendNotificationToUser(sellerUserId, {
    title: '⚠️ Low Stock Alert',
    body:  `Your ${cropType} is almost sold out! Only ${remainingQty}kg remaining.`,
    url:   '/seller/dashboard',
    tag:   'low-stock',
    data:  { type: 'low_stock', cropType, remainingQty }
  })
}