export default function Loading() {
  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-white rounded-3xl shadow-card flex items-center justify-center animate-bounce-sm">
          <svg width="36" height="36" viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="46" y="98" width="100" height="72" rx="6" fill="#1D9E75"/>
            <polygon points="34,100 96,44 158,100" fill="#16A34A"/>
            <rect x="76" y="132" width="30" height="38" rx="4" fill="#FF8C42"/>
          </svg>
        </div>
        <p className="text-sm text-gray-400 font-semibold">Đang tải...</p>
      </div>
    </div>
  )
}
