'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Room } from '@/types'

interface Props {
  defaultFrom: string
  defaultTo:   string
  defaultRoom: string
  rooms:       Pick<Room, 'id' | 'name'>[]
}

export default function ReportFilters({ defaultFrom, defaultTo, defaultRoom, rooms }: Props) {
  const router = useRouter()
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo]     = useState(defaultTo)
  const [room, setRoom] = useState(defaultRoom)

  function apply() {
    const params = new URLSearchParams()
    params.set('from', from)
    params.set('to', to)
    if (room) params.set('room_id', room)
    router.push(`/admin/finance/report?${params.toString()}`)
  }

  function setThisMonth() {
    const now = new Date()
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    const last  = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    setFrom(first.toISOString().split('T')[0])
    setTo(last.toISOString().split('T')[0])
  }
  function setLastMonth() {
    const now = new Date()
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const last  = new Date(now.getFullYear(), now.getMonth(), 0)
    setFrom(first.toISOString().split('T')[0])
    setTo(last.toISOString().split('T')[0])
  }
  function setThisYear() {
    const now = new Date()
    setFrom(`${now.getFullYear()}-01-01`)
    setTo(`${now.getFullYear()}-12-31`)
  }

  return (
    <section className="bg-white rounded-2xl shadow-soft p-4 mb-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Từ ngày</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-field w-full text-sm py-1.5" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Đến ngày</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input-field w-full text-sm py-1.5" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">Phòng</label>
        <select value={room} onChange={e => setRoom(e.target.value)} className="input-field w-full text-sm py-1.5">
          <option value="">Tất cả phòng</option>
          {rooms.map(r => <option key={r.id} value={r.id}>Phòng {r.name}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={setThisMonth} className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold text-gray-600">Tháng này</button>
        <button type="button" onClick={setLastMonth} className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold text-gray-600">Tháng trước</button>
        <button type="button" onClick={setThisYear}  className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold text-gray-600">Năm nay</button>
        <button type="button" onClick={apply}       className="btn-primary text-sm py-1 px-4 ml-auto">Áp dụng</button>
      </div>
    </section>
  )
}
