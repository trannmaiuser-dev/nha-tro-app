import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getAllProofs } from '@/lib/db/payment-proofs'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import PaymentReviewCard from './PaymentReviewCard'
import PaymentsTabs from './PaymentsTabs'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: { status?: string }
}

export default async function AdminPaymentsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') redirect('/login')

  const rawStatus = searchParams.status ?? 'pending'
  const active = (['pending', 'approved', 'rejected', 'all'].includes(rawStatus) ? rawStatus : 'pending') as 'pending' | 'approved' | 'rejected' | 'all'
  const filter = active === 'all' ? undefined : active

  const proofs = await getAllProofs(filter)

  // Count per status (1 round trip)
  const sb = createServerSupabaseClient()
  const { data: countsRows } = await sb
    .from('payment_proofs')
    .select('status')
  const counts = { pending: 0, approved: 0, rejected: 0, all: 0 }
  for (const r of countsRows ?? []) {
    counts.all++
    if      (r.status === 'pending')                                       counts.pending++
    else if (r.status === 'approved' || r.status === 'partially_approved') counts.approved++
    else if (r.status === 'rejected')                                      counts.rejected++
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white pb-24">
      <header className="bg-white shadow-soft sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-5 py-4">
          <Link href="/home" className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600">
            <BackIcon />
          </Link>
          <div>
            <h1 className="text-lg font-black text-gray-800">Duyệt thanh toán</h1>
            <p className="text-xs text-gray-400">{counts.pending} chờ duyệt</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6">
        <PaymentsTabs active={active} counts={counts} />

        {proofs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-5xl mb-3">🎉</p>
            <p className="font-bold text-gray-500">Không có bằng chứng nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {proofs.map(p => (
              <PaymentReviewCard key={p.id} proof={p} />
            ))}
          </div>
        )}
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
