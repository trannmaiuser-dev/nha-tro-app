'use client'

import Image from 'next/image'
import { useState, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import SelectUI from '@/components/ui/Select'
import type { TenantProfile, TenantDocument } from '@/types'

const GENDER_OPTIONS = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
]

interface Props {
  // Display config
  headerTitle:   string
  cancelHref:    string
  successHref:   string
  defaultOccupation?: string

  // Identity
  phone:           string
  initialFullName: string

  // Data
  initialProfile:   TenantProfile | null
  initialDocuments: TenantDocument[]

  // Save target — endpoint receives body { personal, documents, targetUserId? }
  saveEndpoint: string
  targetUserId?: string  // when present, sent in POST body (admin edit other user)
}

async function uploadFile(
  endpoint: '/api/upload/avatar' | '/api/upload/document',
  file: File,
  type?: string,
) {
  const form = new FormData()
  form.append('file', file)
  if (type) form.append('type', type)
  const res = await fetch(endpoint, { method: 'POST', body: form })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Upload failed')
  return data.url as string
}

export default function ProfileEditForm({
  headerTitle, cancelHref, successHref, defaultOccupation,
  phone, initialFullName,
  initialProfile, initialDocuments,
  saveEndpoint, targetUserId,
}: Props) {
  const router = useRouter()

  const [avatarUrl,  setAvatarUrl]  = useState(initialProfile?.avatar_url  || '')
  const [fullName,   setFullName]   = useState(initialProfile?.full_name   || initialFullName)
  const [dob,        setDob]        = useState(initialProfile?.dob         || '')
  const [gender,     setGender]     = useState(initialProfile?.gender      || '')
  const [cccdNumber, setCccdNumber] = useState(initialProfile?.cccd_number || '')
  const [occupation, setOccupation] = useState(initialProfile?.occupation  || defaultOccupation || '')
  const [address,    setAddress]    = useState(initialProfile?.address     || '')

  const initialFront = initialDocuments.find(d => d.type === 'cccd_front')?.file_url || ''
  const initialBack  = initialDocuments.find(d => d.type === 'cccd_back')?.file_url  || ''
  const [cccdFrontUrl, setCccdFrontUrl] = useState(initialFront)
  const [cccdBackUrl,  setCccdBackUrl]  = useState(initialBack)

  const [uploading, setUploading] = useState<'avatar' | 'front' | 'back' | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [toast,     setToast]     = useState('')

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(''), 3000)
  }

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setUploading('avatar')
    try { setAvatarUrl(await uploadFile('/api/upload/avatar', f)) }
    catch (err) { showToast(`Lỗi: ${(err as Error).message}`) }
    finally { setUploading(null) }
  }

  async function handleCccdChange(side: 'front' | 'back', e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setUploading(side)
    try {
      const url = await uploadFile('/api/upload/document', f, side === 'front' ? 'cccd_front' : 'cccd_back')
      if (side === 'front') setCccdFrontUrl(url); else setCccdBackUrl(url)
    } catch (err) { showToast(`Lỗi: ${(err as Error).message}`) }
    finally { setUploading(null) }
  }

  async function handleSave() {
    if (!fullName.trim()) { showToast('Vui lòng nhập họ và tên'); return }
    setSaving(true)
    try {
      const res = await fetch(saveEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId,
          personal: {
            avatar_url:  avatarUrl,
            full_name:   fullName.trim(),
            dob, gender, cccd_number: cccdNumber.trim(),
            occupation:  occupation.trim(),
            address:     address.trim(),
          },
          documents: { cccd_front_url: cccdFrontUrl, cccd_back_url: cccdBackUrl },
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Lưu thất bại')
      showToast('✅ Đã lưu hồ sơ')
      setTimeout(() => router.push(successHref), 800)
    } catch (err) { showToast(`Lỗi: ${(err as Error).message}`) }
    finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-20 bg-white shadow-soft">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.push(cancelHref)} className="text-sm font-bold text-gray-500 px-2 py-1">← Hủy</button>
          <h1 className="text-base font-black text-gray-800 truncate max-w-[60%]">{headerTitle}</h1>
          <button onClick={handleSave} disabled={saving}
            className="btn-primary text-sm px-4 py-1.5 disabled:opacity-50">
            {saving ? 'Đang lưu…' : 'Lưu'}
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <div className="card flex flex-col items-center gap-3">
          <label className="cursor-pointer">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="avatar" width={96} height={96}
                className="w-24 h-24 rounded-3xl object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-3xl bg-primary-50 flex items-center justify-center text-3xl font-black text-primary-600">
                {fullName.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <input type="file" accept="image/*" hidden onChange={handleAvatarChange} />
          </label>
          <p className="text-xs text-gray-400">{uploading === 'avatar' ? 'Đang tải lên…' : 'Bấm vào ảnh để đổi avatar'}</p>
        </div>

        <div className="card space-y-4">
          <Field label="Họ và tên" required>
            <input className="input-field" placeholder="Nguyễn Văn A" value={fullName}
              onChange={e => setFullName(e.target.value)} />
          </Field>
          <Field label="Số điện thoại">
            <input className="input-field bg-gray-50" value={phone} disabled />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ngày sinh">
              <input type="date" className="input-field" value={dob}
                onChange={e => setDob(e.target.value)} />
            </Field>
            <Field label="Giới tính">
              <SelectUI value={gender} onChange={setGender} options={GENDER_OPTIONS} placeholder="Chọn" />
            </Field>
          </div>
          <Field label="Số CCCD / CMND">
            <input className="input-field" placeholder="0xxxxxxxxxx" value={cccdNumber}
              onChange={e => setCccdNumber(e.target.value)} />
          </Field>
          <Field label="Nghề nghiệp">
            <input className="input-field" value={occupation}
              onChange={e => setOccupation(e.target.value)} />
          </Field>
          <Field label="Địa chỉ thường trú">
            <textarea className="input-field resize-none" rows={2} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
              value={address} onChange={e => setAddress(e.target.value)} />
          </Field>
        </div>

        <div className="card space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Giấy tờ tùy thân (tùy chọn)</p>
          <div className="grid grid-cols-2 gap-3">
            <CccdSlot label="CCCD mặt trước" url={cccdFrontUrl} uploading={uploading === 'front'}
              onChange={e => handleCccdChange('front', e)} />
            <CccdSlot label="CCCD mặt sau" url={cccdBackUrl} uploading={uploading === 'back'}
              onChange={e => handleCccdChange('back', e)} />
          </div>
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

function CccdSlot({ label, url, uploading, onChange }: {
  label: string; url: string; uploading: boolean; onChange: (e: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <label className="block cursor-pointer">
      <span className="text-xs font-bold text-gray-500 mb-1.5 block">{label}</span>
      {url ? (
        <div className="relative">
          <Image src={url} alt={label} width={200} height={120}
            className="w-full h-28 rounded-xl object-cover border border-gray-200" />
          <span className="absolute inset-0 rounded-xl bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
            {uploading ? 'Đang tải…' : 'Đổi ảnh'}
          </span>
        </div>
      ) : (
        <div className="w-full h-28 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-xs font-bold text-gray-400">
          {uploading ? 'Đang tải…' : '+ Chụp / tải ảnh'}
        </div>
      )}
      <input type="file" accept="image/*" hidden onChange={onChange} />
    </label>
  )
}
