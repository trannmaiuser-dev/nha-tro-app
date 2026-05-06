/**
 * Tạo VAPID keys cho Web Push notifications
 * Chạy: node scripts/generate-vapid.js
 */
const webpush = require('web-push')
const keys = webpush.generateVAPIDKeys()
console.log('\n✅ VAPID Keys đã tạo xong!\n')
console.log('Thêm vào file .env:\n')
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
console.log('\n⚠️  Lưu ý: Chỉ tạo keys 1 lần! Nếu thay đổi, tất cả subscriptions cũ sẽ mất hiệu lực.')
