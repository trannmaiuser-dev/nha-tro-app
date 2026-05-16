'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Guest } from '@/types'

export default function AdminGuestsPage() {
  const [guests,  setGuests]  = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    fetch('/api/admin/guests')
      .then(r => r.json())
      .then(d => { setGuests(d.guests ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = guests.filter(g => {
    const kw = search.toLowerCase()
    return !kw || g.guest_name.toLowerCase().includes(kw) ||
      g.tenant?.full_name?.toLowerCase().includes(kw) ||
      g.room?.name?.toLowerCase().includes(kw)
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white pb-24">
      <header className="bg-white shadow-soft sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center gap-3 px-5 py-4">
          <Link href="/home" className="p-2 bg-gray-50 rounded-xl text-gray-400"><BackIcon /></Link>
          <div>
            <h1 className="text-lg font-black text-gray-800">Khách đến chơi</h1>
            <p className="text-xs text-gray-400">{guests.length} lượt báo</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-4">
        <input
          type="text"
          placeholder="Tìm tên khách, người báo hoặc phòng..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field w-full"
        />

        {loading ? (
          <p className="text-center text-gray-400 py-10">Đang tải...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16"><div className="text-4xl mb-3">🏠</div><p className="text-gray-400">Chưa có báo cáo nào</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b">
                  <th className="pb-3 font-semibold">Phòng</th>
                  <th className="pb-3 font-semibold">Khách thuê báo</th>
                  <th className="pb-3 font-semibold">Tên khách đến</th>
                  <th className="pb-3 font-semibold">Số đêm</th>
                  <th className="pb-3 font-semibold">Ngày báo</th>
                  <th className="pb-3 font-semibold">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 font-bold text-gray-800">{g.room?.name ?? '—'}</td>
                    <td className="py-3 text-gray-600">{g.tenant?.full_name ?? g.tenant?.phone ?? '—'}</td>
                    <td className="py-3 font-medium text-gray-800">{g.guest_name}</td>
                    <td className="py-3 text-center"><span className="badge-blue">{g.number_of_nights} đêm</span></td>
                    <td className="py-3 text-gray-400">{new Date(g.created_at).toLocaleDateString('vi-VN')}</td>
                    <td className="py-3 text-gray-400 italic max-w-[150px] truncate">{g.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}

function BackIcon() { return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg> }
