'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center p-6">
      <div className="card max-w-sm w-full text-center py-10 shadow-float">
        <p className="text-5xl mb-4">😅</p>
        <h2 className="text-xl font-black text-gray-800 mb-2">Có lỗi xảy ra</h2>
        <p className="text-sm text-gray-400 mb-6">{error.message || 'Vui lòng thử lại'}</p>
        <button onClick={reset} className="btn-primary w-full">
          🔄 Thử lại
        </button>
      </div>
    </div>
  )
}
