'use client'

import { useState, useRef } from 'react'
import { XIcon, ImagePlusIcon } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  /** URL của các ảnh đã upload */
  value: string[]
  onChange: (urls: string[]) => void
  /** API endpoint chấp nhận POST FormData với key "file" và trả { url: string } */
  uploadUrl: string
  maxImages?: number
  /** byte */
  maxSize?: number
  acceptedTypes?: string[]
  disabled?: boolean
}

const DEFAULT_ACCEPT = ['image/jpeg', 'image/png', 'image/webp']
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024

export default function MultiImageUpload({
  value,
  onChange,
  uploadUrl,
  maxImages = 5,
  maxSize = DEFAULT_MAX_SIZE,
  acceptedTypes = DEFAULT_ACCEPT,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const newFiles = Array.from(files)

    if (value.length + newFiles.length > maxImages) {
      toast.error(`Tối đa ${maxImages} ảnh`)
      return
    }
    for (const f of newFiles) {
      if (!acceptedTypes.includes(f.type)) {
        toast.error(`File "${f.name}" không hợp lệ. Chỉ chấp nhận: ${acceptedTypes.map(t => t.split('/')[1]).join(', ')}`)
        return
      }
      if (f.size > maxSize) {
        toast.error(`File "${f.name}" quá lớn (tối đa ${(maxSize / 1024 / 1024).toFixed(0)}MB)`)
        return
      }
    }

    setUploading(true)
    try {
      const uploaded: string[] = []
      for (const file of newFiles) {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch(uploadUrl, { method: 'POST', body: formData })
        if (!res.ok) {
          const errText = await res.text()
          throw new Error(errText || 'Upload thất bại')
        }
        const json = await res.json()
        if (!json.url) throw new Error('Response thiếu URL')
        uploaded.push(json.url)
      }
      onChange([...value, ...uploaded])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload thất bại')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function removeAt(idx: number) {
    onChange(value.filter((_, i) => i !== idx))
  }

  const canAddMore = value.length < maxImages && !disabled

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {value.map((url, i) => (
          <div key={i} className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Ảnh ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              disabled={disabled}
              className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-90 hover:opacity-100"
              aria-label="Xóa ảnh"
            >
              <XIcon size={14} />
            </button>
          </div>
        ))}

        {canAddMore && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-primary-300 hover:text-primary-500 transition"
          >
            {uploading ? (
              <span className="w-6 h-6 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
            ) : (
              <>
                <ImagePlusIcon size={20} />
                <span className="text-xs font-bold">Thêm ảnh</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        multiple
        onChange={e => handleFiles(e.target.files)}
        className="hidden"
      />

      <p className="text-xs text-gray-400">
        {value.length}/{maxImages} ảnh. Chấp nhận JPG/PNG/WebP, tối đa {(maxSize / 1024 / 1024).toFixed(0)}MB mỗi ảnh.
      </p>
    </div>
  )
}
