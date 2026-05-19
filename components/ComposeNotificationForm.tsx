'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { AuthPayload } from '@/types'

interface UserOption {
  id:            string
  full_name:     string | null
  phone:         string
  role:          'owner' | 'tenant'
  tenant_status: string | null
}

type RepeatPreset =
  | 'none'
  | '1h'
  | '6h'
  | '1d'
  | '3d'
  | 'custom'

const REPEAT_OPTIONS: Array<{ value: RepeatPreset; label: string; minutes: number | null }> = [
  { value: 'none',   label: 'Không lặp lại',         minutes: null },
  { value: '1h',     label: 'Mỗi 1 giờ',              minutes: 60 },
  { value: '6h',     label: 'Mỗi 6 giờ',              minutes: 360 },
  { value: '1d',     label: 'Mỗi 1 ngày',             minutes: 1440 },
  { value: '3d',     label: 'Mỗi 3 ngày',             minutes: 4320 },
  { value: 'custom', label: 'Tùy chỉnh (nhập phút)',  minutes: null },
]

export default function ComposeNotificationForm({ currentUser }: { currentUser: AuthPayload }) {
  const router = useRouter()

  const [users, setUsers] = useState<UserOption[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [title,    setTitle]    = useState('')
  const [body,     setBody]     = useState('')
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now')
  const [scheduledAt,  setScheduledAt]  = useState('')  // datetime-local

  const [repeatPreset, setRepeatPreset] = useState<RepeatPreset>('none')
  const [customMinutes, setCustomMinutes] = useState<number>(60)
  const [repeatUntilAck, setRepeatUntilAck] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3500) }

  useEffect(() => {
    fetch('/api/notifications/users-list')
      .then(r => r.json())
      .then(d => setUsers(d.users ?? []))
      .finally(() => setLoadingUsers(false))
  }, [])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function selectAll() { setSelected(new Set(users.map(u => u.id))) }
  function clearAll()  { setSelected(new Set()) }

  function effectiveIntervalMinutes(): number | null {
    if (repeatPreset === 'none') return null
    if (repeatPreset === 'custom') return Math.max(1, Math.floor(customMinutes))
    return REPEAT_OPTIONS.find(o => o.value === repeatPreset)?.minutes ?? null
  }

  async function handleSubmit() {
    if (!title.trim()) { showToast('Nhập tiêu đề'); return }
    if (!body.trim())  { showToast('Nhập nội dung'); return }
    if (selected.size === 0) { showToast('Chọn ít nhất 1 người nhận'); return }
    if (scheduleMode === 'later' && !scheduledAt) {
      showToast('Chọn thời gian gửi')
      return
    }

    const intervalMinutes = effectiveIntervalMinutes()
    if (repeatUntilAck && intervalMinutes === null) {
      showToast('Cần chọn tần suất repeat để bật "đến khi xác nhận"')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/notifications/compose', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:                 title.trim(),
          body:                  body.trim(),
          recipientIds:          Array.from(selected),
          scheduledAt:           scheduleMode === 'later' ? new Date(scheduledAt).toISOString() : null,
          repeatIntervalMinutes: intervalMinutes,
          repeatUntilAck:        repeatUntilAck && intervalMinutes !== null,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Gửi thất bại')
      showToast('✅ Đã tạo thông báo')
      setTimeout(() => router.push('/notifications'), 800)
    } catch (err) {
      showToast(`Lỗi: ${(err as Error).message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-20 bg-white shadow-soft">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="text-sm font-bold text-gray-500 px-2 py-1">← Hủy</button>
          <h1 className="text-base font-black text-gray-800">Soạn thông báo</h1>
          <button onClick={handleSubmit} disabled={submitting}
            className="btn-primary text-sm px-4 py-1.5 disabled:opacity-50">
            {submitting ? 'Đang gửi…' : 'Gửi'}
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <div className="card space-y-3">
          <Field label="Tiêu đề" required>
            <input className="input-field" placeholder="VD: Nhắc đóng tiền tháng 5" value={title}
              onChange={e => setTitle(e.target.value)} />
          </Field>
          <Field label="Nội dung" required>
            <textarea className="input-field resize-none" rows={4} value={body}
              placeholder="Nội dung thông báo gửi tới người nhận…"
              onChange={e => setBody(e.target.value)} />
          </Field>
        </div>

        <div className="card space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Người nhận ({selected.size}/{users.length})
            </p>
            <div className="flex gap-2 text-xs font-bold">
              <button onClick={selectAll}  className="text-primary-600">Chọn tất cả</button>
              <span className="text-gray-300">|</span>
              <button onClick={clearAll}   className="text-gray-400">Bỏ chọn</button>
            </div>
          </div>
          {loadingUsers ? (
            <p className="text-sm text-gray-400">Đang tải danh sách…</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-gray-400">Chưa có người dùng nào khác</p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {users.map(u => (
                <label key={u.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    selected.has(u.id) ? 'bg-primary-50' : 'hover:bg-gray-50'
                  }`}>
                  <input type="checkbox" checked={selected.has(u.id)}
                    onChange={() => toggle(u.id)} className="w-4 h-4 accent-primary-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-700 truncate">
                      {u.full_name || u.phone}
                    </p>
                    <p className="text-xs text-gray-400">
                      {u.role === 'owner' ? '🏠 Chủ trọ' : '👤 Khách'} · {u.phone}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="card space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Thời gian gửi</p>
          <div className="flex gap-2">
            <Pill active={scheduleMode === 'now'}   onClick={() => setScheduleMode('now')}>Gửi ngay</Pill>
            <Pill active={scheduleMode === 'later'} onClick={() => setScheduleMode('later')}>Đặt lịch</Pill>
          </div>
          {scheduleMode === 'later' && (
            <input type="datetime-local" className="input-field"
              value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
          )}
        </div>

        <div className="card space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Lặp lại</p>
          <div className="flex flex-wrap gap-2">
            {REPEAT_OPTIONS.map(opt => (
              <Pill key={opt.value} active={repeatPreset === opt.value}
                onClick={() => setRepeatPreset(opt.value)}>
                {opt.label}
              </Pill>
            ))}
          </div>
          {repeatPreset === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="number" min={1} className="input-field flex-1"
                value={customMinutes}
                onChange={e => setCustomMinutes(Number(e.target.value) || 1)} />
              <span className="text-sm text-gray-500">phút</span>
            </div>
          )}
          {repeatPreset !== 'none' && (
            <label className="flex items-center gap-2 text-sm text-gray-700 mt-1">
              <input type="checkbox" checked={repeatUntilAck}
                onChange={e => setRepeatUntilAck(e.target.checked)}
                className="w-4 h-4 accent-primary-600" />
              <span>Lặp lại cho đến khi người nhận xác nhận</span>
            </label>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg z-30">
          {toast}
        </div>
      )}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-gray-500 mb-1.5 block">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  )
}

function Pill({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button onClick={onClick}
      className={`text-xs font-bold px-3 py-2 rounded-xl transition-colors ${
        active ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
      }`}>
      {children}
    </button>
  )
}
