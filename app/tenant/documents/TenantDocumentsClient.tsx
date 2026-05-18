'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { getTenantDocumentUrlAction } from './actions'
import type { DocumentWithJoins } from '@/lib/db/documents'

interface Props {
  documents: DocumentWithJoins[]
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '?'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function TenantDocumentsClient({ documents }: Props) {
  const [viewing, setViewing] = useState<string | null>(null)

  async function handleView(docId: string) {
    setViewing(docId)
    try {
      const res = await getTenantDocumentUrlAction(docId)
      if (!res.success) { toast.error(res.error); return }
      window.open(res.data.url, '_blank', 'noopener')
    } finally {
      setViewing(null)
    }
  }

  // Group by category
  const grouped = new Map<string, DocumentWithJoins[]>()
  for (const doc of documents) {
    const key = doc.category?.name ?? '(Không danh mục)'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(doc)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white pb-24">
      <header className="bg-white shadow-soft sticky top-0 z-30">
        <div className="max-w-md mx-auto flex items-center gap-3 px-5 py-4">
          <Link href="/dashboard" className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600">
            <BackIcon />
          </Link>
          <div>
            <h1 className="text-lg font-black text-gray-800">📄 Giấy tờ của tôi</h1>
            <p className="text-xs text-gray-400">{documents.length} file</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6 space-y-4">
        {documents.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-3">📁</p>
            <p className="font-bold text-gray-500">Chưa có giấy tờ</p>
            <p className="text-sm mt-1">Chủ trọ sẽ upload hợp đồng + giấy tờ liên quan</p>
          </div>
        ) : (
          Array.from(grouped.entries()).map(([catName, docs]) => (
            <section key={catName} className="card">
              <h2 className="font-black text-gray-700 mb-3 text-sm uppercase tracking-wide">
                {catName} <span className="text-xs text-gray-400 font-normal">({docs.length})</span>
              </h2>
              <div className="space-y-2">
                {docs.map(doc => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    onView={() => handleView(doc.id)}
                    viewing={viewing === doc.id}
                  />
                ))}
              </div>
            </section>
          ))
        )}

        <div className="bg-blue-50 rounded-2xl p-3 text-xs text-blue-700 flex items-start gap-2">
          <span className="shrink-0">ℹ️</span>
          <p>Bạn chỉ xem được giấy tờ gắn với bạn hoặc phòng đang ở. Để upload/sửa, vui lòng liên hệ chủ trọ.</p>
        </div>
      </main>
    </div>
  )
}

function DocumentRow({
  doc, onView, viewing,
}: {
  doc: DocumentWithJoins
  onView: () => void
  viewing: boolean
}) {
  const isPdf = doc.file_type === 'pdf'
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${isPdf ? 'bg-red-100' : 'bg-blue-100'}`}>
        {isPdf ? '📕' : '🖼️'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-gray-700 truncate">{doc.name}</p>
        <p className="text-xs text-gray-400 truncate">
          {doc.room ? `Phòng ${doc.room.name} · ` : ''}
          {formatSize(doc.file_size)} · {formatDate(doc.uploaded_at)}
        </p>
      </div>
      <button
        onClick={onView}
        disabled={viewing}
        className="shrink-0 px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-lg text-xs font-bold disabled:opacity-50"
      >
        {viewing ? '⏳' : '👁️ Xem'}
      </button>
    </div>
  )
}

function BackIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
