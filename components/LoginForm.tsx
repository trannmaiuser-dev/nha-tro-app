'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BiometricPrompt from './BiometricPrompt'
import { startAuthentication } from '@simplewebauthn/browser'

const BIOMETRIC_KEY = 'aloha_biometric_registered'
const PHONE_KEY = 'aloha_last_phone'

export default function LoginForm() {
  const router = useRouter()
  const [phone, setPhone]           = useState('')
  const [password, setPassword]     = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [loading, setLoading]       = useState(false)
  const [bioLoading, setBioLoading] = useState(false)
  const [error, setError]           = useState('')
  const [showBioPrompt, setShowBioPrompt] = useState(false)
  const [hasBiometric, setHasBiometric]   = useState(false)
  const [webAuthnSupported, setWebAuthnSupported] = useState(false)

  useEffect(() => {
    const supported = !!(window.PublicKeyCredential)
    setWebAuthnSupported(supported)
    if (supported) {
      const registered = localStorage.getItem(BIOMETRIC_KEY)
      const savedPhone = localStorage.getItem(PHONE_KEY)
      if (registered === 'true' && savedPhone) {
        setHasBiometric(true)
        setPhone(savedPhone)
      }
    }
  }, [])

  function formatPhone(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 10)
    setPhone(digits)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Đăng nhập thất bại'); return }

      localStorage.setItem(PHONE_KEY, phone)

      const alreadyRegistered = localStorage.getItem(BIOMETRIC_KEY) === 'true'
      if (webAuthnSupported && !alreadyRegistered) {
        setShowBioPrompt(true)
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('Không thể kết nối server')
    } finally {
      setLoading(false)
    }
  }

  async function handleBiometricLogin() {
    setBioLoading(true)
    setError('')
    try {
      const savedPhone = localStorage.getItem(PHONE_KEY)
      if (!savedPhone) { setError('Không tìm thấy tài khoản'); return }

      const optRes = await fetch('/api/webauthn/auth-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: savedPhone }),
      })
      if (!optRes.ok) { setError('Không thể lấy thông tin vân tay'); return }
      const options = await optRes.json()

      const assertion = await startAuthentication(options)

      const verifyRes = await fetch('/api/webauthn/auth-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: savedPhone, assertion }),
      })
      const verifyData = await verifyRes.json()
      if (!verifyRes.ok) { setError(verifyData.error || 'Xác thực vân tay thất bại'); return }

      router.push('/dashboard')
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Bạn đã hủy xác thực vân tay')
      } else {
        setError('Lỗi xác thực vân tay')
      }
    } finally {
      setBioLoading(false)
    }
  }

  function handleBioPromptDone(registered: boolean) {
    setShowBioPrompt(false)
    if (registered) localStorage.setItem(BIOMETRIC_KEY, 'true')
    router.push('/dashboard')
  }

  return (
    <>
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1.5">
            📱 Số điện thoại
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">+84</span>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="0901 000 001"
              value={phone}
              onChange={e => formatPhone(e.target.value)}
              required
              className="input-field pl-14"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1.5">
            🔒 Mật khẩu
          </label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="input-field pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPw ? <EyeOff /> : <EyeOn />}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-500 font-medium">
            ⚠️ {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
          {loading ? <Spinner /> : '🚀 Đăng nhập'}
        </button>
      </form>

      {/* Biometric login */}
      {hasBiometric && webAuthnSupported && (
        <>
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-300 font-semibold">HOẶC</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <button
            onClick={handleBiometricLogin}
            disabled={bioLoading}
            className="w-full flex items-center justify-center gap-3 border-2 border-primary-100 bg-primary-50 text-primary-600 font-bold rounded-2xl py-3.5 active:scale-95 transition-all"
          >
            {bioLoading ? <Spinner color="primary" /> : (
              <>
                <FingerprintIcon />
                Đăng nhập bằng vân tay
              </>
            )}
          </button>
        </>
      )}

      {/* Biometric registration prompt */}
      {showBioPrompt && (
        <BiometricPrompt
          phone={phone}
          onDone={handleBioPromptDone}
        />
      )}
    </>
  )
}

function EyeOn() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOff() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function FingerprintIcon() {
  return (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
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

function Spinner({ color = 'white' }: { color?: string }) {
  const cls = color === 'primary' ? 'border-primary-300 border-t-primary-600' : 'border-white/30 border-t-white'
  return (
    <span className={`inline-block w-5 h-5 rounded-full border-2 ${cls} animate-spin`} />
  )
}
