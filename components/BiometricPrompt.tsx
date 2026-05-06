'use client'

import { useState } from 'react'
import { startRegistration } from '@simplewebauthn/browser'

interface Props {
  phone: string
  onDone: (registered: boolean) => void
}

export default function BiometricPrompt({ phone, onDone }: Props) {
  const [loading, setLoading] = useState(false)
  const [step, setStep]       = useState<'prompt' | 'success' | 'error'>('prompt')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleEnable() {
    setLoading(true)
    setErrorMsg('')
    try {
      const optRes = await fetch('/api/webauthn/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      if (!optRes.ok) throw new Error('Không thể tạo options')
      const options = await optRes.json()

      const regResponse = await startRegistration(options)

      const verifyRes = await fetch('/api/webauthn/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, registration: regResponse }),
      })
      if (!verifyRes.ok) throw new Error('Xác minh thất bại')

      setStep('success')
      setTimeout(() => onDone(true), 1500)
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        onDone(false)
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Lỗi không xác định')
        setStep('error')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-float w-full max-w-sm p-6 animate-slide-up">
        {step === 'prompt' && (
          <>
            <div className="flex justify-center mb-5">
              <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center">
                <FingerprintBig />
              </div>
            </div>
            <h2 className="text-xl font-black text-center text-gray-800 mb-2">
              Bật đăng nhập vân tay?
            </h2>
            <p className="text-sm text-gray-400 text-center mb-6 leading-relaxed">
              Lần sau mở app chỉ cần chạm vân tay là vào ngay — nhanh và an toàn hơn nhập mật khẩu nhé! 🔐
            </p>
            {errorMsg && (
              <div className="bg-red-50 rounded-xl p-3 mb-4 text-sm text-red-500 text-center">
                {errorMsg}
              </div>
            )}
            <div className="space-y-3">
              <button
                onClick={handleEnable}
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? <Spinner /> : '👆 Bật ngay'}
              </button>
              <button
                onClick={() => onDone(false)}
                className="btn-ghost w-full text-center"
              >
                Để lần sau
              </button>
            </div>
          </>
        )}

        {step === 'success' && (
          <div className="text-center py-4">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-xl font-black text-primary-600 mb-2">Xong rồi!</h2>
            <p className="text-gray-400 text-sm">Đã bật đăng nhập vân tay thành công</p>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-4">
            <div className="text-6xl mb-4">😅</div>
            <h2 className="text-xl font-black text-gray-700 mb-2">Chưa bật được</h2>
            <p className="text-gray-400 text-sm mb-4">{errorMsg}</p>
            <button onClick={() => onDone(false)} className="btn-primary w-full">
              OK, bỏ qua
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function FingerprintBig() {
  return (
    <svg width="44" height="44" fill="none" stroke="#1D9E75" strokeWidth="1.6" viewBox="0 0 24 24">
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/>
      <path d="M2 12a10 10 0 0 1 18-6"/>
      <path d="M2 17.5A14.5 14.5 0 0 0 5 21"/>
      <path d="M8 21.46a25 25 0 0 0 .7-3.46"/>
      <path d="M6 12a6 6 0 0 1 6-6"/>
      <path d="M2 11a2 2 0 0 1 2-2"/>
      <path d="M20.97 12c.03.33.03.66 0 1"/>
    </svg>
  )
}

function Spinner() {
  return <span className="inline-block w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
}
