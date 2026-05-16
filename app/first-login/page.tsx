'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function FirstLoginContent() {
  const router      = useRouter()
  const params      = useSearchParams()
  const token       = params.get('token') || ''

  const [status,      setStatus]      = useState<'loading' | 'valid' | 'invalid' | 'expired'>('loading')
  const [phone,       setPhone]       = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [show,        setShow]        = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState('')

  useEffect(() => {
    if (!token) { setStatus('invalid'); return }
    fetch(`/api/first-login?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.valid) { setPhone(d.phone); setStatus('valid') }
        else if (d.error?.includes('hết hạn')) setStatus('expired')
        else setStatus('invalid')
      })
      .catch(() => setStatus('invalid'))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirm) { setError('Mật khẩu không khớp'); return }
    if (newPassword.length < 6)  { setError('Mật khẩu tối thiểu 6 ký tự'); return }
    setSubmitting(true); setError('')
    try {
      const res  = await fetch('/api/first-login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Lỗi không xác định'); return }
      router.push('/profile/setup')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50 to-white">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Đang xác thực link...</p>
      </div>
    </div>
  )

  if (status === 'invalid') return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50 to-white p-6">
      <div className="card max-w-sm w-full text-center">
        <p className="text-5xl mb-4">❌</p>
        <h2 className="text-xl font-black text-gray-800 mb-2">Link không hợp lệ</h2>
        <p className="text-gray-500 text-sm">Vui lòng liên hệ chủ nhà để nhận link mới.</p>
      </div>
    </div>
  )

  if (status === 'expired') return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50 to-white p-6">
      <div className="card max-w-sm w-full text-center">
        <p className="text-5xl mb-4">⏰</p>
        <h2 className="text-xl font-black text-gray-800 mb-2">Link đã hết hạn</h2>
        <p className="text-gray-500 text-sm">Link đăng nhập chỉ có hiệu lực 7 ngày. Liên hệ chủ nhà để nhận link mới.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">🏠</div>
          <h1 className="text-2xl font-black text-gray-800">Chào mừng bạn!</h1>
          <p className="text-gray-400 text-sm mt-1">Tài khoản: <strong className="text-gray-600">{phone}</strong></p>
          <p className="text-gray-400 text-sm mt-1">Tạo mật khẩu mới để bắt đầu</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1.5">Mật khẩu mới</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                required
                className="input-field pr-12"
              />
              <button type="button" onClick={() => setShow(!show)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">
                {show ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1.5">Xác nhận mật khẩu</label>
            <input
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              required
              className="input-field"
            />
          </div>

          {error && <p className="text-red-500 text-sm font-medium bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? '⏳ Đang xử lý...' : 'Tiếp tục →'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function FirstLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"/></div>}>
      <FirstLoginContent />
    </Suspense>
  )
}
