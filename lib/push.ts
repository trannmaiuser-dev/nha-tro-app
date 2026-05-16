import webpush from 'web-push'

let initialized = false

function init() {
  if (initialized) return
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@alohahome.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
  initialized = true
}

export interface PushSubscriptionRow {
  endpoint: string
  p256dh:   string
  auth:     string
}

export async function sendPushNotification(
  sub: PushSubscriptionRow,
  payload: { title: string; body: string; data?: Record<string, unknown> }
) {
  init()
  return webpush.sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify(payload)
  )
}
