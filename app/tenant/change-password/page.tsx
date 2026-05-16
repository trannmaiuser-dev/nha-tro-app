'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [newPw,     setNewPw]     = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [errors,    setErrors]    = useState<Record<string, string>>({})

  function validate() {
    const errs: Record<string, string> = {}
    if (newPw.length < 8)                    errs.newPw     = 'Mật khẩu ít nhất 8 ký tự'
    if (!/[a-zA-Z]/.test(newPw))             errs.newPw     = 'Mật khẩu phải có ít nhất 1 chữ cái'
    if (!/\d/.test(newPw))                   errs.newPw     = 'Mật khẩu phải có ít nhất 1 chữ số'
    if (newPw !== confirmPw)                  errs.confirmPw = 'Mật khẩu xác nhận không khớp'
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      const res = await fetch('/api/tenant/change-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ newPassword: newPw }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Đổi mật khẩu thất bại'); return }
      toast.success('Đã đổi mật khẩu thành công')
      router.push('/profile/setup')
    } catch {
      toast.error('Không thể kết nối server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-primary-50 to-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="text-2xl font-black text-gray-800">Đổi mật khẩu</h1>
          <p className="text-sm text-gray-400 mt-1">Vui lòng đổi mật khẩu trước khi tiếp tục</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1.5">
                Mật khẩu mới <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                placeholder="Ít nhất 8 ký tự, có chữ và số"
                value={newPw}
                onChange={e => { setNewPw(e.target.value); setErrors({}) }}
                className={`input-field w-full ${errors.newPw ? 'error' : ''}`}
              />
              {errors.newPw && <p className="text-xs text-red-500 mt-1">{errors.newPw}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1.5">
                Xác nhận mật khẩu <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPw}
                onChange={e => { setConfirmPw(e.target.value); setErrors({}) }}
                className={`input-field w-full ${errors.confirmPw ? 'error' : ''}`}
              />
              {errors.confirmPw && <p className="text-xs text-red-500 mt-1">{errors.confirmPw}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Xác nhận đổi mật khẩu
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
