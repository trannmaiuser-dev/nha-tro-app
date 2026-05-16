'use client'

import { useState } from 'react'
import { XIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

interface Props {
  images: string[]
  /** Kích thước thumbnail (mặc định 80px) */
  thumbSize?: number
}

export default function ImageCarousel({ images, thumbSize = 80 }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  if (images.length === 0) return null

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {images.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpenIdx(i)}
            className="rounded-xl overflow-hidden bg-gray-100 hover:opacity-80 transition"
            style={{ width: thumbSize, height: thumbSize }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Ảnh ${i + 1}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {openIdx != null && (
        <div
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center"
          onClick={() => setOpenIdx(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[openIdx]}
            alt={`Ảnh ${openIdx + 1}`}
            className="max-w-full max-h-full object-contain"
            onClick={e => e.stopPropagation()}
          />

          <button
            type="button"
            onClick={() => setOpenIdx(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
          >
            <XIcon size={20} />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setOpenIdx((openIdx + images.length - 1) % images.length) }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
                aria-label="Ảnh trước"
              >
                <ChevronLeftIcon size={24} />
              </button>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setOpenIdx((openIdx + 1) % images.length) }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
                aria-label="Ảnh sau"
              >
                <ChevronRightIcon size={24} />
              </button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-white/10 rounded-full text-white text-sm">
                {openIdx + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
