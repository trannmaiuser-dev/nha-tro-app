import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import LoginForm from '@/components/LoginForm'

export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 via-white to-white flex flex-col items-center justify-center p-6">
      {/* Floating blobs */}
      <div className="fixed top-0 right-0 w-64 h-64 bg-primary-100 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-48 h-48 bg-accent-100 rounded-full translate-y-1/2 -translate-x-1/2 opacity-40 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        {/* Illustration */}
        <div className="flex justify-center mb-6">
          <HouseIllustration />
        </div>

        {/* Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-primary-600 tracking-tight">Aloha Tran Home</h1>
          <p className="text-gray-400 text-sm mt-1.5 font-medium">Quản lý nhà trọ thông minh 🏡</p>
        </div>

        {/* Login card */}
        <div className="card shadow-float">
          <LoginForm />
        </div>

        <p className="text-center text-xs text-gray-300 mt-6 font-medium">
          Aloha Tran Home &copy; 2025
        </p>
      </div>
    </main>
  )
}

function HouseIllustration() {
  return (
    <svg width="200" height="185" viewBox="0 0 200 185" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ground */}
      <ellipse cx="100" cy="165" rx="85" ry="12" fill="#C8E6C9" opacity="0.6"/>
      {/* Grass strip */}
      <rect x="20" y="150" width="160" height="18" rx="9" fill="#A5D6A7"/>

      {/* Left tree trunk */}
      <rect x="23" y="120" width="6" height="32" rx="3" fill="#795548"/>
      <circle cx="26" cy="110" r="18" fill="#66BB6A"/>
      <circle cx="18" cy="118" r="12" fill="#81C784"/>
      <circle cx="34" cy="115" r="13" fill="#4CAF50"/>

      {/* Right tree trunk */}
      <rect x="171" y="125" width="5" height="27" rx="2.5" fill="#795548"/>
      <circle cx="173" cy="115" r="15" fill="#81C784"/>
      <circle cx="165" cy="121" r="10" fill="#A5D6A7"/>

      {/* House shadow */}
      <ellipse cx="100" cy="153" rx="55" ry="8" fill="#000" opacity="0.05"/>

      {/* House body */}
      <rect x="48" y="85" width="104" height="72" rx="6" fill="white"/>
      <rect x="48" y="85" width="104" height="72" rx="6" stroke="#E8F5E9" strokeWidth="2"/>

      {/* Roof */}
      <polygon points="38,88 100,32 162,88" fill="#1D9E75"/>
      <polygon points="38,88 100,32 162,88" fill="url(#roofGrad)"/>
      {/* Roof ridge */}
      <line x1="100" y1="32" x2="100" y2="88" stroke="#16A34A" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5"/>

      {/* Chimney */}
      <rect x="130" y="44" width="14" height="34" rx="3" fill="#FFAB91"/>
      <rect x="128" y="43" width="18" height="5" rx="2" fill="#FF8A65"/>
      {/* Smoke */}
      <circle cx="137" cy="35" r="5" fill="#ECEFF1" opacity="0.8"/>
      <circle cx="143" cy="27" r="4" fill="#ECEFF1" opacity="0.55"/>
      <circle cx="136" cy="20" r="3" fill="#ECEFF1" opacity="0.3"/>

      {/* Door */}
      <rect x="82" y="118" width="36" height="39" rx="5" fill="#FF8C42"/>
      <rect x="82" y="118" width="36" height="20" rx="5" fill="#FFB74D"/>
      {/* Door knob */}
      <circle cx="113" cy="138" r="3" fill="#FFD54F"/>
      <circle cx="113" cy="138" r="1.5" fill="#FFA000"/>
      {/* Door arch decoration */}
      <path d="M 84 123 Q 100 113 116 123" stroke="#FF8C42" strokeWidth="2" fill="none"/>

      {/* Left window */}
      <rect x="55" y="94" width="28" height="22" rx="4" fill="#B3E5FC"/>
      <rect x="55" y="94" width="28" height="22" rx="4" stroke="#81D4FA" strokeWidth="1.5"/>
      {/* Window cross */}
      <line x1="69" y1="94" x2="69" y2="116" stroke="#81D4FA" strokeWidth="1"/>
      <line x1="55" y1="105" x2="83" y2="105" stroke="#81D4FA" strokeWidth="1"/>
      {/* Cat in window */}
      <ellipse cx="65" cy="110" rx="7" ry="5" fill="#FF8A65"/>
      <circle cx="65" cy="102" r="6" fill="#FF8A65"/>
      <polygon points="60,98 62,92 65,98" fill="#FF8A65"/>
      <polygon points="65,98 68,92 70,98" fill="#FF8A65"/>
      <circle cx="62.5" cy="101" r="1.5" fill="#333"/>
      <circle cx="67.5" cy="101" r="1.5" fill="#333"/>
      <circle cx="62.5" cy="101" r="0.6" fill="white"/>
      <circle cx="67.5" cy="101" r="0.6" fill="white"/>
      <ellipse cx="65" cy="103.5" rx="1" ry="0.7" fill="#FF5252"/>
      <path d="M 63 105 Q 65 107 67 105" stroke="#555" strokeWidth="0.8" fill="none"/>

      {/* Right window */}
      <rect x="117" y="94" width="28" height="22" rx="4" fill="#B3E5FC"/>
      <rect x="117" y="94" width="28" height="22" rx="4" stroke="#81D4FA" strokeWidth="1.5"/>
      <line x1="131" y1="94" x2="131" y2="116" stroke="#81D4FA" strokeWidth="1"/>
      <line x1="117" y1="105" x2="145" y2="105" stroke="#81D4FA" strokeWidth="1"/>

      {/* Flower pots */}
      <rect x="60" y="147" width="10" height="7" rx="2" fill="#FF8C42"/>
      <circle cx="65" cy="145" r="5" fill="#4CAF50"/>
      <circle cx="61" cy="143" r="3.5" fill="#FF80AB"/>
      <circle cx="68" cy="143" r="3" fill="#FFCA28"/>

      <rect x="130" y="147" width="10" height="7" rx="2" fill="#FF8C42"/>
      <circle cx="135" cy="145" r="5" fill="#4CAF50"/>
      <circle cx="131" cy="143" r="3" fill="#FFCA28"/>
      <circle cx="138" cy="143" r="3.5" fill="#FF80AB"/>

      <defs>
        <linearGradient id="roofGrad" x1="100" y1="32" x2="100" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#16A34A" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#1D9E75" stopOpacity="0"/>
        </linearGradient>
      </defs>
    </svg>
  )
}
