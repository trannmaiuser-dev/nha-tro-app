'use client'

import { useRef, useState } from 'react'
import { checkFaceQuality } from '@/lib/faceCheck'

type CheckState = 'idle' | 'checking' | 'pass' | 'fail'

interface Props {
  value:             string | null
  onChange:          (url: string) => void
  uploading:         boolean
  onUpload:          (file: File) => Promise<void>
  onValidityChange?: (valid: boolean) => void
  label:             string
  hint?:             string
  required?:         boolean
}

async function cropToSquare(file: File): Promise<Blob> {
  return new Promise(resolve => {
    const img    = new Image()
    const objUrl = URL.createObjectURL(file)
    img.onload = () => {
      const size = Math.min(img.width, img.height)
      const out  = Math.min(size, 600)
      const cv   = document.createElement('canvas')
      cv.width = cv.height = out
      cv.getContext('2d')!.drawImage(img, (img.width-size)/2, (img.height-size)/2, size, size, 0, 0, out, out)
      URL.revokeObjectURL(objUrl)
      cv.toBlob(b => resolve(b!), 'image/jpeg', 0.85)
    }
    img.src = objUrl
  })
}

export default function ImageCapture({
  value, onChange, uploading, onUpload, onValidityChange, label, hint, required,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview,    setPreview]    = useState<string | null>(value)
  const [checkState, setCheckState] = useState<CheckState>('idle')
  const [checkMsg,   setCheckMsg]   = useState('')

  async function handleFile(file: File) {
    // Reset state
    setCheckState('idle')
    setCheckMsg('')

    // 1. Crop → show preview immediately
    const blob    = await cropToSquare(file)
    const dataUrl = URL.createObjectURL(blob)
    setPreview(dataUrl)

    // 2. Face check (with timeout fallback in faceCheck.ts)
    setCheckState('checking')
    const result = await checkFaceQuality(blob)

    if (!result.ok) {
      setCheckState('fail')
      setCheckMsg(result.reason)
      onValidityChange?.(false)
      return  // Don't upload a photo that failed face check
    }

    // 3. Face check passed → upload
    setCheckState('pass')
    onChange(dataUrl)          // set preview URL so parent shows it
    onValidityChange?.(true)
    await onUpload(new File([blob], 'photo.jpg', { type: 'image/jpeg' }))
  }

  function retake() {
    setCheckState('idle')
    setCheckMsg('')
    setPreview(null)
    onChange('')
    onValidityChange?.(false)
    fileRef.current?.click()
  }

  const display = preview || value

  // Border color based on state
  const borderClass =
    checkState === 'pass' ? 'border-primary-400 border-solid' :
    checkState === 'fail' ? 'border-red-400 border-solid'     :
    display               ? 'border-primary-200 border-solid' :
                            'border-gray-200 border-dashed'

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => !display ? fileRef.current?.click() : undefined}
          disabled={uploading || checkState === 'checking'}
          className={`relative w-28 h-28 rounded-2xl overflow-hidden border-2 transition-all
            ${borderClass} ${!display ? 'bg-gray-50 active:scale-95' : ''}`}
        >
          {display ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={display} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-1 text-gray-400">
              <CameraIcon />
              <span className="text-xs font-semibold">Chụp ảnh</span>
            </div>
          )}

          {/* Overlay states */}
          {checkState === 'checking' && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-white text-[10px] font-semibold">Đang kiểm tra...</span>
            </div>
          )}

          {(uploading && checkState !== 'checking') && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Pass badge */}
          {checkState === 'pass' && !uploading && (
            <div className="absolute bottom-1 right-1 bg-primary-600 rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
              <CheckIcon />
            </div>
          )}

          {/* Fail badge */}
          {checkState === 'fail' && (
            <div className="absolute bottom-1 right-1 bg-red-500 rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
              <XIcon />
            </div>
          )}

          {/* Edit button when idle+pass */}
          {checkState !== 'checking' && checkState !== 'fail' && display && !uploading && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
              className="absolute top-1 right-1 bg-black/50 rounded-full w-5 h-5 flex items-center justify-center"
            >
              <EditIcon />
            </button>
          )}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
        />
      </div>

      <div className="text-center max-w-[140px]">
        <p className="text-sm font-bold text-gray-700">
          {label}{required && <span className="text-red-400 ml-1">*</span>}
        </p>
        {hint && checkState === 'idle' && (
          <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
        )}

        {/* Status messages */}
        {checkState === 'pass' && (
          <p className="text-xs text-primary-600 font-bold mt-1">✓ Ảnh đạt yêu cầu</p>
        )}

        {checkState === 'fail' && (
          <div className="mt-1 space-y-1">
            <p className="text-xs text-red-500 font-semibold leading-tight">{checkMsg}</p>
            <button
              type="button"
              onClick={retake}
              className="text-xs text-white bg-red-500 font-bold px-2.5 py-1 rounded-lg active:scale-95 transition-all"
            >
              Chụp lại 📷
            </button>
          </div>
        )}

        {checkState === 'idle' && !display && (
          <p className="text-xs text-primary-500 font-semibold mt-1">
            Nhấn để chụp ảnh
          </p>
        )}
      </div>
    </div>
  )
}

function CameraIcon() {
  return (
    <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="12" height="12" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}
function XIcon() {
  return (
    <svg width="12" height="12" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}
function EditIcon() {
  return (
    <svg width="10" height="10" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}
