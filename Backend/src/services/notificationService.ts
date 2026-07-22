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
      badge:  payload.badge || '/icons/favicon-96x96.png',
      url:    payload.url   || '/',
      tag:    payload.tag   || 'agroflow',
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
  await Promise.allSettled(userIds.map(id => sendNotificationToUser(id, payload)))
}

// ── NOTIFICATION TEMPLATES ────────────────────────────────────

export async function notifyNewListing(buyerUserIds: string[], cropType: string, location: string) {
  await sendNotificationToUsers(buyerUserIds, {
    title: `🌾 New ${cropType} Available!`,
    body:  `Fresh ${cropType} just listed in ${location}. Tap to view.`,
    url:   '/buyer/dashboard',
    tag:   'new-listing',
  })
}

export async function notifyOrderStatusUpdate(buyerUserId: string, status: string, cropType: string) {
  const statusMessages: Record<string, string> = {
    accepted:           'Your order has been accepted by the seller!',
    preparing:          'Seller is preparing your produce.',
    transport_assigned: 'Transport has been assigned for your order.',
    in_transit:         'Your produce is on the way!',
    delivered:          'Your produce has been delivered. Please confirm receipt.',
    completed:          'Order completed successfully!',
    cancelled:          'Your order has been cancelled.',
  }

  await sendNotificationToUser(buyerUserId, {
    title: `📦 Order Update — ${cropType}`,
    body:  statusMessages[status] || `Order status: ${status}`,
    url:   '/buyer/dashboard',
    tag:   'order-update',
  })
}

export async function notifyNewRequest(sellerUserId: string, cropType: string, quantity: number) {
  await sendNotificationToUser(sellerUserId, {
    title: '🛒 New Buy Request!',
    body:  `Someone wants to buy ${quantity}kg of your ${cropType}. Tap to respond.`,
    url:   '/seller/dashboard',
    tag:   'new-request',
  })
}

export async function notifyNewMatch(userIds: string[], cropType: string) {
  await sendNotificationToUsers(userIds, {
    title: '🤝 New Match Found!',
    body:  `A match has been found for ${cropType}. Tap to view details.`,
    url:   '/buyer/dashboard',
    tag:   'new-match',
  })
}