'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ImageCapture from '@/components/profile/ImageCapture'
import SelectUI from '@/components/ui/Select'
import { preloadFaceModels } from '@/lib/faceCheck'
import type { AuthPayload, TenantProfile, EmergencyContact, RelatedPerson, TenantDocument } from '@/types'

// ─── Types ───────────────────────────────────────────────────
interface Step1Data {
  avatar_url: string; full_name: string; dob: string; gender: string
  cccd_number: string; address: string; occupation: string
}
interface Step2Data {
  cccd_front_url: string; cccd_back_url: string
  contract_urls: string[]; contract_types: string[]
  custom_docs: { name: string; url: string; file_type: string }[]
}
interface Step3Data extends Omit<EmergencyContact, 'id'> {}
interface Step4Data { persons: RelatedPerson[] }

interface Props {
  currentUser:       AuthPayload
  initialProfile:    TenantProfile | null
  initialEmergency:  EmergencyContact | null
  initialRelated:    RelatedPerson[]
  initialDocuments:  TenantDocument[]
  maxRelated:        number
}

const DRAFT_KEY = (id: string) => `profile-draft-${id}`
const TOTAL_STEPS = 5
const GENDERS = [{ v: 'male', l: 'Nam' }, { v: 'female', l: 'Nữ' }, { v: 'other', l: 'Khác' }]
const GENDER_OPTIONS = GENDERS.map(g => ({ value: g.v, label: g.l }))

// ─── Upload helpers ──────────────────────────────────────────
async function uploadAvatar(file: File): Promise<string> {
  const form = new FormData(); form.append('file', file)
  const res = await fetch('/api/upload/avatar', { method: 'POST', body: form })
  const { url, error } = await res.json()
  if (error) throw new Error(error)
  return url
}

async function uploadDocument(file: File, type: string): Promise<{ url: string; fileType: string }> {
  const form = new FormData(); form.append('file', file); form.append('type', type)
  const res = await fetch('/api/upload/document', { method: 'POST', body: form })
  const { url, fileType, error } = await res.json()
  if (error) throw new Error(error)
  return { url, fileType }
}

// ─── Main Wizard ─────────────────────────────────────────────
export default function ProfileSetupWizard({
  currentUser, initialProfile, initialEmergency, initialRelated, initialDocuments, maxRelated,
}: Props) {
  const router  = useRouter()
  const draftKey = DRAFT_KEY(currentUser.userId)

  // ── Initial state from DB or localStorage ──
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [toast,  setToast]  = useState('')

  // Face-check validity (true = pass/preexisting, false = fail, null = not yet checked)
  const [avatarValidity,   setAvatarValidity]   = useState<boolean | null>(
    initialProfile?.avatar_url ? true : null
  )
  const [ecAvatarValidity, setEcAvatarValidity] = useState<boolean | null>(
    initialEmergency?.avatar_url ? true : null
  )
  const [relatedValidity,  setRelatedValidity]  = useState<(boolean | null)[]>(
    initialRelated.map(p => p.avatar_url ? true : null)
  )

  // Preload face models in background when wizard mounts
  useEffect(() => { preloadFaceModels() }, [])

  // Step 1
  const [s1, setS1] = useState<Step1Data>(() => {
    const doc = initialDocuments  // unused here
    void doc
    return {
      avatar_url:  initialProfile?.avatar_url  || '',
      full_name:   initialProfile?.full_name   || '',
      dob:         initialProfile?.dob         || '',
      gender:      initialProfile?.gender      || '',
      cccd_number: initialProfile?.cccd_number || '',
      address:     initialProfile?.address     || '',
      occupation:  initialProfile?.occupation  || '',
    }
  })
  const [avatarUploading, setAvatarUploading] = useState(false)

  // Step 2
  const [s2, setS2] = useState<Step2Data>(() => {
    const cccd_front = initialDocuments.find(d => d.type === 'cccd_front')?.file_url || ''
    const cccd_back  = initialDocuments.find(d => d.type === 'cccd_back')?.file_url  || ''
    const contracts  = initialDocuments.filter(d => d.type === 'contract')
    const customs    = initialDocuments.filter(d => d.type === 'custom')
    return {
      cccd_front_url:  cccd_front,
      cccd_back_url:   cccd_back,
      contract_urls:   contracts.map(c => c.file_url),
      contract_types:  contracts.map(c => c.file_type || 'file'),
      custom_docs:     customs.map(c => ({ name: c.custom_name || '', url: c.file_url, file_type: c.file_type || 'file' })),
    }
  })
  const [cccdFrontUploading, setCccdFrontUploading] = useState(false)
  const [cccdBackUploading,  setCccdBackUploading]  = useState(false)
  const [contractUploading,  setContractUploading]  = useState(false)

  // Step 3
  const [s3, setS3] = useState<Step3Data>(() => initialEmergency ? {
    relationship: initialEmergency.relationship || '',
    full_name:    initialEmergency.full_name     || '',
    gender:       initialEmergency.gender        || '',
    dob:          initialEmergency.dob           || '',
    phone:        initialEmergency.phone         || '',
    address:      initialEmergency.address       || '',
    avatar_url:   initialEmergency.avatar_url    || null,
  } : { relationship: '', full_name: '', gender: '', dob: '', phone: '', address: '', avatar_url: null })
  const [ecAvatarUploading, setEcAvatarUploading] = useState(false)

  // Step 4
  const [s4, setS4] = useState<Step4Data>(() => ({
    persons: initialRelated.length > 0 ? initialRelated.map(p => ({
      relationship: p.relationship || '', full_name: p.full_name || '',
      phone: p.phone || '', avatar_url: p.avatar_url || null,
      gender: p.gender || '', dob: p.dob || '',
    })) : [],
  }))
  const [relatedUploading, setRelatedUploading] = useState<boolean[]>([])

  // Load draft from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey)
      if (saved && !initialProfile?.full_name) {
        const d = JSON.parse(saved)
        if (d.s1) setS1(d.s1)
        if (d.s2) setS2(d.s2)
        if (d.s3) setS3(d.s3)
        if (d.s4) setS4(d.s4)
        if (d.step) setStep(d.step)
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save draft to localStorage
  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ s1, s2, s3, s4, step }))
    } catch { /* ignore */ }
  }, [draftKey, s1, s2, s3, s4, step])

  useEffect(() => { saveDraft() }, [saveDraft])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  // ── Save current step to backend ──
  async function saveStep(stepNum: number) {
    setSaving(true)
    try {
      let body: Record<string, unknown> = {}
      if (stepNum === 1) body = { personal: s1 }
      if (stepNum === 2) body = { documents: s2 }
      if (stepNum === 3) body = { emergency: s3 }
      if (stepNum === 4) body = { related: s4.persons }

      const res = await fetch('/api/profile/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json(); showToast('Lỗi: ' + d.error); return false }
      return true
    } finally {
      setSaving(false)
    }
  }

  // ── Navigation ──
  async function nextStep() {
    if (!validateStep(step)) return
    const ok = await saveStep(step)
    if (!ok) return
    setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function prevStep() { setStep(s => Math.max(1, s - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  function validateStep(s: number): boolean {
    if (s === 1) {
      if (!s1.full_name.trim())  { showToast('Vui lòng nhập họ tên'); return false }
      if (!s1.dob)               { showToast('Vui lòng chọn ngày sinh'); return false }
      if (!s1.gender)            { showToast('Vui lòng chọn giới tính'); return false }
      if (!s1.cccd_number.trim()){ showToast('Vui lòng nhập số CCCD'); return false }
      if (!s1.address.trim())    { showToast('Vui lòng nhập địa chỉ'); return false }
      if (!s1.avatar_url)        { showToast('Vui lòng chụp ảnh chân dung'); return false }
      if (avatarValidity === false) { showToast('Ảnh chân dung chưa đạt yêu cầu, vui lòng chụp lại'); return false }
      if (avatarUploading)          { showToast('Đang tải ảnh lên, vui lòng đợi...'); return false }
    }
    if (s === 3) {
      if (!s3.relationship.trim() || !s3.full_name.trim() || !s3.phone.trim() || !(s3.address ?? '').trim()) {
        showToast('Vui lòng điền đầy đủ thông tin người liên hệ'); return false
      }
      if (!s3.gender) { showToast('Vui lòng chọn giới tính người liên hệ'); return false }
      if (!s3.dob)    { showToast('Vui lòng nhập ngày sinh người liên hệ'); return false }
      if (ecAvatarValidity === false) { showToast('Ảnh người liên hệ chưa đạt yêu cầu, vui lòng chụp lại'); return false }
    }
    if (s === 4) {
      for (let i = 0; i < s4.persons.length; i++) {
        if (relatedValidity[i] === false) {
          showToast(`Ảnh người ${i + 1} chưa đạt yêu cầu, vui lòng chụp lại`); return false
        }
      }
    }
    return true
  }

  // ── Submit final ──
  async function handleSubmit() {
    setSaving(true)
    try {
      const res = await fetch('/api/profile/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submit: true }),
      })
      if (!res.ok) { const d = await res.json(); showToast('Lỗi: ' + d.error); return }
      localStorage.removeItem(draftKey)
      router.push('/dashboard')
    } finally { setSaving(false) }
  }

  // ─────────────────────────────────────────────────────────────
  const docsMissing = !s2.cccd_front_url || !s2.cccd_back_url || s2.contract_urls.length === 0

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Progress bar */}
      <div className="sticky top-0 z-20 bg-white shadow-soft">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Hồ sơ khách thuê</p>
            <p className="text-xs font-bold text-primary-600">Bước {step}/{TOTAL_STEPS}</p>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i + 1 < step ? 'bg-primary-600' : i + 1 === step ? 'bg-primary-400' : 'bg-gray-200'
              }`} />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">

        {/* ── STEP 1: Personal Info ──────────────────────── */}
        {step === 1 && (
          <div className="animate-slide-up space-y-4">
            <StepHeader emoji="👤" title="Thông tin cá nhân" subtitle="Điền đầy đủ để chủ nhà xác minh" />

            <div className="card flex justify-center">
              <ImageCapture
                value={s1.avatar_url}
                onChange={url => setS1(p => ({ ...p, avatar_url: url }))}
                uploading={avatarUploading}
                onUpload={async (f) => {
                  setAvatarUploading(true)
                  try { const u = await uploadAvatar(f); setS1(p => ({ ...p, avatar_url: u })) }
                  catch { showToast('Upload ảnh thất bại') }
                  finally { setAvatarUploading(false) }
                }}
                onValidityChange={setAvatarValidity}
                label="Ảnh chân dung"
                hint="Mặt nhìn thẳng, đủ sáng"
                required
              />
            </div>

            <div className="card space-y-4">
              <Field label="Họ và tên" required>
                <input className="input-field" placeholder="Nguyễn Văn A" value={s1.full_name}
                  onChange={e => setS1(p => ({ ...p, full_name: e.target.value }))} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ngày sinh" required>
                  <input type="date" className="input-field" value={s1.dob}
                    onChange={e => setS1(p => ({ ...p, dob: e.target.value }))} />
                </Field>
                <Field label="Giới tính" required>
                  <SelectUI
                    value={s1.gender}
                    onChange={v => setS1(p => ({ ...p, gender: v }))}
                    options={GENDER_OPTIONS}
                    placeholder="Chọn giới tính"
                  />
                </Field>
              </div>
              <Field label="Số CCCD / CMND" required>
                <input className="input-field" placeholder="0xxxxxxxxxx" value={s1.cccd_number}
                  onChange={e => setS1(p => ({ ...p, cccd_number: e.target.value }))} />
              </Field>
              <Field label="Địa chỉ thường trú" required>
                <textarea className="input-field resize-none" rows={2} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                  value={s1.address} onChange={e => setS1(p => ({ ...p, address: e.target.value }))} />
              </Field>
              <Field label="Nghề nghiệp">
                <input className="input-field" placeholder="Sinh viên, nhân viên văn phòng..." value={s1.occupation}
                  onChange={e => setS1(p => ({ ...p, occupation: e.target.value }))} />
              </Field>
            </div>
          </div>
        )}

        {/* ── STEP 2: Documents ─────────────────────────── */}
        {step === 2 && (
          <div className="animate-slide-up space-y-4">
            <StepHeader emoji="📄" title="Giấy tờ" subtitle="CCCD và hợp đồng bắt buộc trong 7 ngày" />

            {docsMissing && (
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3">
                <span className="text-orange-500 text-lg">⚠️</span>
                <p className="text-sm text-orange-700 font-semibold">Chưa hoàn thiện — có thể bỏ qua và bổ sung sau</p>
              </div>
            )}

            <div className="card space-y-5">
              <p className="font-black text-gray-800">Bắt buộc <span className="text-red-400">*</span></p>

              {/* CCCD front */}
              <DocUpload
                label="Mặt trước CCCD"
                url={s2.cccd_front_url}
                uploading={cccdFrontUploading}
                accept="image/*"
                onFile={async (f) => {
                  setCccdFrontUploading(true)
                  try { const { url } = await uploadDocument(f, 'cccd_front'); setS2(p => ({ ...p, cccd_front_url: url })) }
                  catch { showToast('Upload thất bại') }
                  finally { setCccdFrontUploading(false) }
                }}
              />

              {/* CCCD back */}
              <DocUpload
                label="Mặt sau CCCD"
                url={s2.cccd_back_url}
                uploading={cccdBackUploading}
                accept="image/*"
                onFile={async (f) => {
                  setCccdBackUploading(true)
                  try { const { url } = await uploadDocument(f, 'cccd_back'); setS2(p => ({ ...p, cccd_back_url: url })) }
                  catch { showToast('Upload thất bại') }
                  finally { setCccdBackUploading(false) }
                }}
              />

              {/* Contract */}
              <div>
                <p className="text-sm font-bold text-gray-600 mb-2">Hợp đồng thuê nhà (PDF/ảnh)</p>
                <div className="space-y-2">
                  {s2.contract_urls.map((url, i) => (
                    <div key={i} className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                      <span className="text-green-600">✅</span>
                      <a href={url} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-primary-600 font-semibold truncate flex-1">
                        File {i + 1}
                      </a>
                      <button onClick={() => setS2(p => ({
                        ...p, contract_urls: p.contract_urls.filter((_, j) => j !== i),
                        contract_types: p.contract_types.filter((_, j) => j !== i),
                      }))} className="text-red-400 text-xs font-bold">✕</button>
                    </div>
                  ))}
                  <label className={`flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:border-primary-300 transition-colors ${contractUploading ? 'opacity-50' : ''}`}>
                    <span className="text-primary-600 font-bold text-sm">
                      {contractUploading ? '⏳ Đang tải...' : '+ Thêm file hợp đồng'}
                    </span>
                    <input type="file" accept="image/*,.pdf" className="hidden" disabled={contractUploading}
                      onChange={async e => {
                        const f = e.target.files?.[0]; if (!f) return
                        e.target.value = ''
                        setContractUploading(true)
                        try {
                          const { url, fileType } = await uploadDocument(f, 'contract')
                          setS2(p => ({ ...p, contract_urls: [...p.contract_urls, url], contract_types: [...p.contract_types, fileType] }))
                        } catch { showToast('Upload thất bại') }
                        finally { setContractUploading(false) }
                      }} />
                  </label>
                </div>
              </div>
            </div>

            {/* Custom docs */}
            <div className="card space-y-3">
              <p className="font-black text-gray-800">Giấy tờ khác <span className="text-gray-400 text-sm font-medium">(tùy chọn)</span></p>
              {s2.custom_docs.map((doc, i) => (
                <div key={i} className="bg-gray-50 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input className="input-field flex-1" placeholder="Tên giấy tờ..." value={doc.name}
                      onChange={e => {
                        const nd = [...s2.custom_docs]
                        nd[i] = { ...nd[i], name: e.target.value }
                        setS2(p => ({ ...p, custom_docs: nd }))
                      }} />
                    <button onClick={() => setS2(p => ({ ...p, custom_docs: p.custom_docs.filter((_, j) => j !== i) }))}
                      className="w-8 h-8 flex items-center justify-center text-red-400 bg-red-50 rounded-xl font-bold text-sm shrink-0">✕</button>
                  </div>
                  {doc.url
                    ? <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-500 font-semibold">✅ Đã upload</a>
                    : <label className="text-xs text-gray-400 font-semibold cursor-pointer">
                        📎 Chọn file
                        <input type="file" accept="image/*,.pdf" className="hidden"
                          onChange={async e => {
                            const f = e.target.files?.[0]; if (!f) return
                            e.target.value = ''
                            try {
                              const { url, fileType } = await uploadDocument(f, 'custom')
                              const nd = [...s2.custom_docs]; nd[i] = { ...nd[i], url, file_type: fileType }
                              setS2(p => ({ ...p, custom_docs: nd }))
                            } catch { showToast('Upload thất bại') }
                          }} />
                      </label>}
                </div>
              ))}
              <button
                onClick={() => setS2(p => ({ ...p, custom_docs: [...p.custom_docs, { name: '', url: '', file_type: '' }] }))}
                className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-3 text-sm font-bold text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-colors">
                ＋ Thêm giấy tờ khác
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Emergency Contact ──────────────────── */}
        {step === 3 && (
          <div className="animate-slide-up space-y-4">
            <StepHeader emoji="🆘" title="Người liên hệ khẩn cấp" subtitle="Bắt buộc — 1 người thân hoặc bạn bè tin cậy" />
            <div className="card space-y-4">
              <div className="flex justify-center">
                <ImageCapture
                  value={s3.avatar_url ?? null}
                  onChange={url => setS3(p => ({ ...p, avatar_url: url }))}
                  uploading={ecAvatarUploading}
                  onUpload={async (f) => {
                    setEcAvatarUploading(true)
                    try { const u = await uploadAvatar(f); setS3(p => ({ ...p, avatar_url: u })) }
                    catch { showToast('Upload ảnh thất bại') }
                    finally { setEcAvatarUploading(false) }
                  }}
                  onValidityChange={setEcAvatarValidity}
                  label="Ảnh người liên hệ"
                  hint="Tùy chọn nhưng nên có"
                />
              </div>
              <Field label="Quan hệ với bạn" required>
                <input className="input-field" placeholder="Cha, mẹ, anh, chị, bạn bè..." value={s3.relationship}
                  onChange={e => setS3(p => ({ ...p, relationship: e.target.value }))} />
              </Field>
              <Field label="Họ tên" required>
                <input className="input-field" placeholder="Họ và tên đầy đủ" value={s3.full_name}
                  onChange={e => setS3(p => ({ ...p, full_name: e.target.value }))} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Giới tính" required>
                  <SelectUI
                    value={s3.gender ?? ''}
                    onChange={v => setS3(p => ({ ...p, gender: v }))}
                    options={GENDER_OPTIONS}
                    placeholder="Chọn giới tính"
                  />
                </Field>
                <Field label="Ngày sinh" required>
                  <input type="date" className="input-field" value={s3.dob ?? ''}
                    onChange={e => setS3(p => ({ ...p, dob: e.target.value }))} />
                </Field>
              </div>
              <Field label="Số điện thoại" required>
                <input type="tel" className="input-field" placeholder="0xxxxxxxxx" value={s3.phone}
                  onChange={e => setS3(p => ({ ...p, phone: e.target.value }))} />
              </Field>
              <Field label="Địa chỉ" required>
                <textarea className="input-field resize-none" rows={2} placeholder="Địa chỉ hiện tại"
                  value={s3.address ?? ''} onChange={e => setS3(p => ({ ...p, address: e.target.value }))} />
              </Field>
            </div>
          </div>
        )}

        {/* ── STEP 4: Related Persons ────────────────────── */}
        {step === 4 && (
          <div className="animate-slide-up space-y-4">
            <StepHeader emoji="👥" title="Người thường lui tới" subtitle={`Bạn bè, người thân hay tới thăm (tối đa ${maxRelated} người)`} />

            {s4.persons.length === 0 && (
              <div className="card text-center py-8">
                <p className="text-4xl mb-3">👋</p>
                <p className="text-gray-400 font-medium text-sm">Chưa có ai — có thể bỏ qua bước này</p>
              </div>
            )}

            {s4.persons.map((person, i) => (
              <div key={i} className="card space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-black text-gray-700">Người {i + 1}</p>
                  <button onClick={() => {
                    setS4(p => ({ persons: p.persons.filter((_, j) => j !== i) }))
                    setRelatedValidity(prev => prev.filter((_, j) => j !== i))
                  }} className="text-red-400 bg-red-50 rounded-xl px-3 py-1 text-xs font-bold">Xóa</button>
                </div>
                <div className="flex justify-center">
                  <ImageCapture
                    value={person.avatar_url}
                    onChange={url => {
                      const np = [...s4.persons]; np[i] = { ...np[i], avatar_url: url }
                      setS4({ persons: np })
                    }}
                    uploading={relatedUploading[i] || false}
                    onUpload={async (f) => {
                      const nu = [...relatedUploading]; nu[i] = true; setRelatedUploading(nu)
                      try {
                        const u = await uploadAvatar(f)
                        const np = [...s4.persons]; np[i] = { ...np[i], avatar_url: u }
                        setS4({ persons: np })
                      } catch { showToast('Upload ảnh thất bại') }
                      finally { const nu2 = [...relatedUploading]; nu2[i] = false; setRelatedUploading(nu2) }
                    }}
                    onValidityChange={valid => {
                      setRelatedValidity(prev => {
                        const n = [...prev]; n[i] = valid; return n
                      })
                    }}
                    label="Ảnh chân dung"
                    required
                  />
                </div>
                <Field label="Họ tên" required>
                  <input className="input-field" placeholder="Họ và tên" value={person.full_name}
                    onChange={e => { const np = [...s4.persons]; np[i] = { ...np[i], full_name: e.target.value }; setS4({ persons: np }) }} />
                </Field>
                <Field label="Quan hệ" required>
                  <input className="input-field" placeholder="Bạn thân, anh chị em, bạn cùng phòng cũ..." value={person.relationship}
                    onChange={e => { const np = [...s4.persons]; np[i] = { ...np[i], relationship: e.target.value }; setS4({ persons: np }) }} />
                </Field>
                <Field label="SĐT" required>
                  <input type="tel" className="input-field" placeholder="0xxxxxxxxx" value={person.phone}
                    onChange={e => { const np = [...s4.persons]; np[i] = { ...np[i], phone: e.target.value }; setS4({ persons: np }) }} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Giới tính">
                    <SelectUI
                      value={person.gender || ''}
                      onChange={v => { const np = [...s4.persons]; np[i] = { ...np[i], gender: v }; setS4({ persons: np }) }}
                      options={GENDER_OPTIONS}
                      placeholder="Giới tính"
                    />
                  </Field>
                  <Field label="Ngày sinh">
                    <input type="date" className="input-field" value={person.dob || ''}
                      onChange={e => { const np = [...s4.persons]; np[i] = { ...np[i], dob: e.target.value }; setS4({ persons: np }) }} />
                  </Field>
                </div>
              </div>
            ))}

            {s4.persons.length < maxRelated && (
              <button
                onClick={() => {
                  setS4(p => ({ persons: [...p.persons, { relationship: '', full_name: '', phone: '', avatar_url: null, gender: '', dob: '' }] }))
                  setRelatedValidity(prev => [...prev, null])
                }}
                className="w-full border-2 border-dashed border-primary-200 rounded-2xl py-4 text-primary-600 font-bold text-sm hover:bg-primary-50 transition-colors">
                ＋ Thêm người
              </button>
            )}
          </div>
        )}

        {/* ── STEP 5: Review ─────────────────────────────── */}
        {step === 5 && (
          <div className="animate-slide-up space-y-4">
            <StepHeader emoji="✅" title="Xem lại hồ sơ" subtitle="Kiểm tra trước khi hoàn thành" />

            {docsMissing && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-bold text-orange-700 text-sm">Giấy tờ chưa hoàn thiện</p>
                  <p className="text-orange-600 text-xs mt-0.5">
                    {!s2.cccd_front_url && '• Thiếu CCCD mặt trước\n'}
                    {!s2.cccd_back_url  && '• Thiếu CCCD mặt sau\n'}
                    {s2.contract_urls.length === 0 && '• Thiếu hợp đồng thuê nhà'}
                  </p>
                  <p className="text-orange-500 text-xs mt-1 font-medium">Cần bổ sung trong vòng 7 ngày</p>
                </div>
              </div>
            )}

            {/* Personal */}
            <ReviewSection title="👤 Thông tin cá nhân" onEdit={() => setStep(1)}>
              <div className="flex items-center gap-3 mb-3">
                {s1.avatar_url && <Image src={s1.avatar_url} alt="avatar" width={56} height={56} className="w-14 h-14 rounded-xl object-cover" />}
                <div>
                  <p className="font-black text-gray-800">{s1.full_name || '—'}</p>
                  <p className="text-xs text-gray-400">{s1.occupation || 'Không có nghề nghiệp'}</p>
                </div>
              </div>
              <ReviewRow label="Ngày sinh" value={formatDate(s1.dob)} />
              <ReviewRow label="Giới tính" value={{ male: 'Nam', female: 'Nữ', other: 'Khác' }[s1.gender] || '—'} />
              <ReviewRow label="CCCD" value={s1.cccd_number || '—'} />
              <ReviewRow label="Địa chỉ" value={s1.address || '—'} />
            </ReviewSection>

            {/* Documents */}
            <ReviewSection title="📄 Giấy tờ" onEdit={() => setStep(2)}>
              <ReviewRow label="CCCD mặt trước" value={s2.cccd_front_url ? '✅ Đã upload' : '⚠️ Chưa có'} />
              <ReviewRow label="CCCD mặt sau"   value={s2.cccd_back_url  ? '✅ Đã upload' : '⚠️ Chưa có'} />
              <ReviewRow label="Hợp đồng"       value={s2.contract_urls.length > 0 ? `✅ ${s2.contract_urls.length} file` : '⚠️ Chưa có'} />
              {s2.custom_docs.filter(d => d.url).map((d, i) => (
                <ReviewRow key={i} label={d.name || `Giấy tờ ${i+1}`} value="✅ Đã upload" />
              ))}
            </ReviewSection>

            {/* Emergency */}
            <ReviewSection title="🆘 Liên hệ khẩn cấp" onEdit={() => setStep(3)}>
              {s3.full_name ? <>
                <div className="flex items-center gap-3 mb-2">
                  {s3.avatar_url && <Image src={s3.avatar_url} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover" />}
                  <div>
                    <p className="font-bold text-sm text-gray-700">{s3.full_name}</p>
                    <p className="text-xs text-gray-400">{s3.relationship} · {s3.phone}</p>
                  </div>
                </div>
              </> : <p className="text-sm text-orange-500 font-medium">⚠️ Chưa điền</p>}
            </ReviewSection>

            {/* Related */}
            <ReviewSection title="👥 Người thường lui tới" onEdit={() => setStep(4)}>
              {s4.persons.length === 0
                ? <p className="text-sm text-gray-400">Không có</p>
                : s4.persons.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                    {p.avatar_url && <Image src={p.avatar_url} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover shrink-0" />}
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{p.full_name}</p>
                      <p className="text-xs text-gray-400">{p.relationship} · {p.phone}</p>
                    </div>
                  </div>
                ))}
            </ReviewSection>

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="btn-primary w-full text-base py-4">
              {saving ? '⏳ Đang gửi...' : '🎉 Hoàn thành đăng ký'}
            </button>
          </div>
        )}

        {/* Navigation */}
        {step < TOTAL_STEPS && (
          <div className={`flex gap-3 ${step === 1 ? 'justify-end' : 'justify-between'}`}>
            {step > 1 && (
              <button onClick={prevStep} className="btn-ghost flex-1 max-w-32">← Quay lại</button>
            )}
            <button onClick={nextStep} disabled={saving} className="btn-primary flex-1">
              {saving ? '⏳ Đang lưu...' : step === 2 ? (docsMissing ? 'Bỏ qua tạm →' : 'Tiếp theo →') : 'Tiếp theo →'}
            </button>
          </div>
        )}
        {step === TOTAL_STEPS && step > 1 && (
          <button onClick={prevStep} className="btn-ghost w-full">← Quay lại sửa</button>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white font-semibold text-sm px-5 py-3 rounded-2xl shadow-float z-50 animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  )
}

// ─── Small shared components ─────────────────────────────────
function StepHeader({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-xl font-black text-gray-800">{emoji} {title}</h2>
      <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-600 mb-1.5">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

function DocUpload({ label, url, uploading, accept, onFile }: {
  label: string; url: string; uploading: boolean; accept: string
  onFile: (f: File) => Promise<void>
}) {
  return (
    <div>
      <p className="text-sm font-bold text-gray-600 mb-2">{label}</p>
      {url
        ? <div className="flex items-center gap-2">
            {url.match(/\.(jpg|jpeg|png|webp)$/i)
              ? <Image src={url} alt={label} width={130} height={80} className="h-20 rounded-xl object-cover border border-gray-100" />
              : <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary-600 font-semibold text-sm">✅ Xem file</a>}
            <label className="text-xs text-gray-400 font-semibold cursor-pointer border border-gray-200 rounded-lg px-2 py-1">
              Đổi
              <input type="file" accept={accept} className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
            </label>
          </div>
        : <label className={`flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-2xl px-4 py-4 cursor-pointer hover:border-primary-300 transition-colors ${uploading ? 'opacity-50' : ''}`}>
            <span className="text-2xl">📎</span>
            <span className="text-sm font-semibold text-gray-500">
              {uploading ? '⏳ Đang tải lên...' : 'Chọn ảnh hoặc chụp'}
            </span>
            <input type="file" accept={accept} className="hidden" disabled={uploading}
              onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
          </label>}
    </div>
  )
}

function ReviewSection({ title, children, onEdit }: { title: string; children: React.ReactNode; onEdit: () => void }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <p className="font-black text-gray-800 text-sm">{title}</p>
        <button onClick={onEdit} className="text-xs text-primary-600 font-bold">Sửa</button>
      </div>
      {children}
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      <span className="text-xs font-bold text-gray-700 text-right max-w-[60%]">{value}</span>
    </div>
  )
}

function formatDate(iso: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
