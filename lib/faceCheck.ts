// Browser-only — never import from server code

export type FaceCheckResult =
  | { ok: true }
  | { ok: false; reason: string }

let modelsLoaded = false
let loadingPromise: Promise<void> | null = null

async function ensureModels(): Promise<void> {
  if (modelsLoaded) return
  if (loadingPromise) return loadingPromise
  loadingPromise = (async () => {
    const faceapi = await import('face-api.js')
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    ])
    modelsLoaded = true
  })()
  return loadingPromise
}

function blobToImg(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img load failed')) }
    img.src = url
  })
}

function avg(pts: { x: number; y: number }[]) {
  const s = pts.reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y }), { x: 0, y: 0 })
  return { x: s.x / pts.length, y: s.y / pts.length }
}

async function runCheck(blob: Blob): Promise<FaceCheckResult> {
  await ensureModels()
  const faceapi = await import('face-api.js')
  const img     = await blobToImg(blob)

  const detections = await faceapi
    .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 }))
    .withFaceLandmarks()

  // 1. Không có mặt
  if (detections.length === 0) {
    return { ok: false, reason: 'Không tìm thấy khuôn mặt, vui lòng chụp lại 📷' }
  }

  // 2. Nhiều hơn 1 mặt
  if (detections.length > 1) {
    return { ok: false, reason: 'Chỉ chụp 1 người trong ảnh' }
  }

  const { detection, landmarks } = detections[0]

  // 3. Mặt quá nhỏ (< 25% diện tích ảnh)
  const faceArea = detection.box.width * detection.box.height
  const imgArea  = img.naturalWidth * img.naturalHeight
  if (faceArea / imgArea < 0.25) {
    return { ok: false, reason: 'Ảnh quá xa, vui lòng chụp gần hơn 🔍' }
  }

  // 4. Góc nghiêng > 20° (tính qua tâm 2 mắt)
  const positions = landmarks.positions
  const leftEye   = avg(positions.slice(36, 42))
  const rightEye  = avg(positions.slice(42, 48))
  const angleDeg  = Math.abs(
    Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * 180 / Math.PI
  )
  if (angleDeg > 20) {
    return { ok: false, reason: 'Vui lòng nhìn thẳng vào camera' }
  }

  return { ok: true }
}

export async function checkFaceQuality(blob: Blob): Promise<FaceCheckResult> {
  const timeout = new Promise<FaceCheckResult>(resolve =>
    setTimeout(() => resolve({ ok: true }), 5000)  // fallback sau 5s
  )
  return Promise.race([runCheck(blob).catch(() => ({ ok: true as const })), timeout])
}

/** Preload models in background (call on page mount) */
export function preloadFaceModels() {
  if (typeof window === 'undefined') return
  ensureModels().catch(() => {})
}
