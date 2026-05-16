import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getPaymentProofsByTenant } from '@/lib/db/payment-proofs'
import TenantPaymentsClient from './TenantPaymentsClient'

export const dynamic = 'force-dynamic'

export default async function TenantPaymentsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'tenant') redirect('/home')

  const proofs = await getPaymentProofsByTenant(user.userId)

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white pb-24">
      <header className="bg-white shadow-soft sticky top-0 z-30">
        <div className="max-w-md mx-auto flex items-center gap-3 px-5 py-4">
          <Link href="/home" className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600">
            <BackIcon />
          </Link>
          <div>
            <h1 className="text-lg font-black text-gray-800">Thanh toán</h1>
            <p className="text-xs text-gray-400">{proofs.length} báo cáo</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6">
        <TenantPaymentsClient proofs={proofs} />
      </main>
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
