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

export async function sendPushNotification(
  subscriptionJson: string,
  payload: { title: string; body: string; data?: Record<string, unknown> }
) {
  init()
  const subscription = JSON.parse(subscriptionJson) as webpush.PushSubscription
  return webpush.sendNotification(subscription, JSON.stringify(payload))
}
