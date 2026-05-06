import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center p-6">
      <div className="card max-w-sm w-full text-center py-10 shadow-float">
        <p className="text-5xl mb-4">🏚️</p>
        <h2 className="text-2xl font-black text-gray-800 mb-2">404</h2>
        <p className="text-sm text-gray-400 mb-6">Không tìm thấy trang này</p>
        <Link href="/" className="btn-primary inline-block">
          🏠 Về trang chủ
        </Link>
      </div>
    </div>
  )
}
