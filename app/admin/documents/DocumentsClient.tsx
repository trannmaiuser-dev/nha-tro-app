'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  uploadDocumentAction,
  deleteDocumentAction,
  getDocumentUrlAction,
} from './actions'
import type { DocumentCategory, DocumentWithJoins } from '@/lib/db/documents'

interface Room   { id: string; name: string; floor: number }
interface Tenant { id: string; full_name: string; phone: string }

interface Props {
  categories: DocumentCategory[]
  documents:  DocumentWithJoins[]
  rooms:      Room[]
  tenants:    Tenant[]
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

export default function DocumentsClient({ categories, documents, rooms, tenants }: Props) {
  const router = useRouter()
  const [showUpload, setShowUpload] = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const [deleting,   setDeleting]   = useState<string | null>(null)
  const [viewing,    setViewing]    = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('')

  // Form state
  const [file,       setFile]       = useState<File | null>(null)
  const [name,       setName]       = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [roomId,     setRoomId]     = useState('')
  const [tenantId,   setTenantId]   = useState('')

  function resetForm() {
    setFile(null); setName(''); setCategoryId(categories[0]?.id ?? ''); setRoomId(''); setTenantId('')
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return toast.error('Vui lòng chọn file')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('name', name || file.name)
      fd.append('category_id', categoryId)
      fd.append('room_id', roomId)
      fd.append('tenant_id', tenantId)
      const res = await uploadDocumentAction(fd)
      if (!res.success) { toast.error(res.error); return }
      toast.success('✅ Đã upload')
      resetForm(); setShowUpload(false); router.refresh()
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string, docName: string) {
    if (!confirm(`Xóa "${docName}"?`)) return
    setDeleting(id)
    try {
      const res = await deleteDocumentAction(id)
      if (!res.success) { toast.error(res.error); return }
      toast.success('🗑️ Đã xóa')
      router.refresh()
    } finally {
      setDeleting(null)
    }
  }

  async function handleView(id: string, filePath: string) {
    setViewing(id)
    try {
      const res = await getDocumentUrlAction(filePath)
      if (!res.success) { toast.error(res.error); return }
      window.open(res.data.url, '_blank', 'noopener')
    } finally {
      setViewing(null)
    }
  }

  // Group by category
  const filtered = filterCategory
    ? documents.filter(d => d.category_id === filterCategory)
    : documents
  const grouped = new Map<string, DocumentWithJoins[]>()
  for (const doc of filtered) {
    const key = doc.category?.name ?? '(Không danh mục)'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(doc)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white pb-24">
      <header className="bg-white shadow-soft sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <Link href="/home" className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600">
              <BackIcon />
            </Link>
            <div>
              <h1 className="text-lg font-black text-gray-800">📄 Giấy tờ</h1>
              <p className="text-xs text-gray-400">{documents.length} file</p>
            </div>
          </div>
          <button onClick={() => setShowUpload(true)} className="btn-primary px-4 py-2 text-sm">
            ＋ Upload
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-4">
        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterChip
            label="Tất cả"
            active={filterCategory === ''}
            onClick={() => setFilterCategory('')}
            count={documents.length}
          />
          {categories.map(c => (
            <FilterChip
              key={c.id}
              label={c.name}
              active={filterCategory === c.id}
              onClick={() => setFilterCategory(c.id)}
              count={documents.filter(d => d.category_id === c.id).length}
            />
          ))}
        </div>

        {/* Grouped list */}
        {documents.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-3">📁</p>
            <p className="font-bold text-gray-500">Chưa có giấy tờ nào</p>
            <p className="text-sm mt-1">Nhấn Upload để thêm file đầu tiên</p>
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
                    onView={() => handleView(doc.id, doc.file_url)}
                    onDelete={() => handleDelete(doc.id, doc.name)}
                    viewing={viewing === doc.id}
                    deleting={deleting === doc.id}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Upload Modal */}
      {showUpload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
          onClick={() => !uploading && setShowUpload(false)}
        >
          <form
            onSubmit={handleUpload}
            onClick={e => e.stopPropagation()}
            className="bg-white w-full max-w-md rounded-3xl p-6 space-y-4 animate-slide-up"
          >
            <h2 className="text-lg font-black text-gray-800">Upload giấy tờ</h2>

            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1.5">
                File <span className="text-red-400">*</span>
              </label>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
                onChange={e => {
                  const f = e.target.files?.[0]
                  setFile(f ?? null)
                  if (f && !name) setName(f.name.replace(/\.[^.]+$/, ''))
                }}
                required
                className="input-field w-full text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">PDF / JPG / PNG / WebP / HEIC, tối đa 10MB</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1.5">
                Tên hiển thị <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="vd: Hợp đồng phòng P101"
                required
                className="input-field w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1.5">
                Danh mục <span className="text-red-400">*</span>
              </label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                required
                className="input-field w-full"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1.5">
                Phòng <span className="text-gray-400 font-normal">(tùy chọn)</span>
              </label>
              <select
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                className="input-field w-full"
              >
                <option value="">-- Không gắn phòng (chung) --</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>Phòng {r.name} (Tầng {r.floor})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1.5">
                Khách thuê <span className="text-gray-400 font-normal">(tùy chọn)</span>
              </label>
              <select
                value={tenantId}
                onChange={e => setTenantId(e.target.value)}
                className="input-field w-full"
              >
                <option value="">-- Không gắn khách --</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name} ({t.phone})</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowUpload(false)}
                disabled={uploading}
                className="btn-ghost flex-1 py-3 text-sm"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={uploading || !file}
                className="btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-2"
              >
                {uploading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {uploading ? 'Đang upload...' : 'Upload'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function FilterChip({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
        active
          ? 'bg-primary-500 text-white'
          : 'bg-white text-gray-500 border border-gray-200 hover:border-primary-300'
      }`}
    >
      {label} <span className={active ? 'text-white/80' : 'text-gray-400'}>({count})</span>
    </button>
  )
}

function DocumentRow({
  doc, onView, onDelete, viewing, deleting,
}: {
  doc: DocumentWithJoins
  onView: () => void
  onDelete: () => void
  viewing: boolean
  deleting: boolean
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
          {doc.tenant ? `${doc.tenant.full_name} · ` : ''}
          {formatSize(doc.file_size)} · {formatDate(doc.uploaded_at)}
        </p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <button
          onClick={onView}
          disabled={viewing}
          className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-lg text-xs font-bold disabled:opacity-50"
        >
          {viewing ? '⏳' : '👁️ Xem'}
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold disabled:opacity-50"
        >
          {deleting ? '⏳' : '🗑️'}
        </button>
      </div>
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
