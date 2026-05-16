import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getInvoiceById } from '@/lib/db/invoices'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { InvoiceStatus, PaymentProof } from '@/types'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<InvoiceStatus, { label: string; cls: string }> = {
  unpaid:         { label: 'Chưa thanh toán', cls: 'badge-orange' },
  partially_paid: { label: 'Trả 1 phần',      cls: 'badge-orange' },
  paid:           { label: 'Đã thanh toán',   cls: 'badge-green' },
}

interface PageProps {
  params: { id: string }
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') redirect('/login')

  const invoice = await getInvoiceById(params.id)
  if (!invoice) notFound()

  // Fetch payment proofs for this invoice
  const sb = createServerSupabaseClient()
  const { data: proofsRes } = await sb
    .from('payment_proofs')
    .select('*, tenant:users!tenant_id(id, full_name, phone)')
    .eq('invoice_id', params.id)
    .order('created_at', { ascending: false })
  const proofs = (proofsRes ?? []) as PaymentProof[]

  const remaining = invoice.total - invoice.paid_amount
  const st = STATUS_LABEL[invoice.status]
  const extraItems = Array.isArray(invoice.extra_items) ? invoice.extra_items : []

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white pb-24">
      <header className="bg-white shadow-soft sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/finance/invoices" className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600">
              <BackIcon />
            </Link>
            <div>
              <h1 className="text-lg font-black text-gray-800">Hóa đơn {invoice.room?.name}</h1>
              <p className="text-xs text-gray-400">Tháng {invoice.month}/{invoice.year}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/admin/finance/invoices/${invoice.id}/export`}
              className="btn-secondary text-sm py-1.5 px-3"
              target="_blank"
              rel="noopener noreferrer"
            >
              📄 Xuất PDF
            </a>
            <span className={st.cls}>{st.label}</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6 space-y-4">
        {/* Tổng quan */}
        <section className="bg-white rounded-2xl shadow-soft p-5">
          <h2 className="font-bold text-gray-700 mb-3">Chi tiết</h2>
          <div className="space-y-2 text-sm">
            <Line label="Tiền phòng"    value={invoice.rent_amount} />
            <Line label="Tiền điện"     value={invoice.electricity_amount} />
            <Line label="Tiền nước"     value={invoice.water_amount} hint={waterModeLabel(invoice.water_billing_mode)} />
            {invoice.trash_fee > 0         && <Line label="Phí rác"          value={invoice.trash_fee} />}
            {invoice.parking_fee > 0       && <Line label="Phí gửi xe"       value={invoice.parking_fee} />}
            {invoice.internet_fee > 0      && <Line label="Phí internet"     value={invoice.internet_fee} />}
            {invoice.over_capacity_fee > 0 && <Line label="Phụ phí quá người" value={invoice.over_capacity_fee} />}
            {extraItems.map((it, i) => (
              <Line key={i} label={it.label} value={it.amount} hint="Phụ phí phát sinh" />
            ))}

            <div className="border-t pt-2 mt-3 flex items-center justify-between">
              <span className="font-black text-gray-800">Tổng cộng</span>
              <span className="font-black text-xl text-primary-600">{invoice.total.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Đã thanh toán</span>
              <span className="font-bold">{invoice.paid_amount.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Còn lại</span>
              <span className={`font-bold ${remaining > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                {remaining.toLocaleString('vi-VN')}đ
              </span>
            </div>
          </div>

          {invoice.note && (
            <div className="mt-4 pt-3 border-t text-sm">
              <p className="text-gray-400 text-xs mb-1">Ghi chú</p>
              <p className="text-gray-700">{invoice.note}</p>
            </div>
          )}

          <div className="mt-4 text-xs text-gray-400 flex justify-between">
            <span>Tạo: {new Date(invoice.created_at).toLocaleDateString('vi-VN')}</span>
            <span>Hạn: {new Date(invoice.due_date).toLocaleDateString('vi-VN')}</span>
          </div>
        </section>

        {/* Bằng chứng thanh toán */}
        <section className="bg-white rounded-2xl shadow-soft p-5">
          <h2 className="font-bold text-gray-700 mb-3">Bằng chứng thanh toán ({proofs.length})</h2>
          {proofs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Chưa có bằng chứng nào</p>
          ) : (
            <div className="space-y-2">
              {proofs.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 text-sm">
                  <div>
                    <p className="font-bold text-gray-700">{p.tenant?.full_name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{new Date(p.created_at).toLocaleString('vi-VN')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{p.amount_reported.toLocaleString('vi-VN')}đ</p>
                    <p className="text-xs">
                      <span className={`badge-${p.status === 'approved' ? 'green' : p.status === 'rejected' ? 'gray' : 'orange'}`}>
                        {labelForProofStatus(p.status)}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link
            href="/admin/finance/payments"
            className="block mt-3 text-center text-sm text-primary-600 hover:underline"
          >
            Xem tất cả bằng chứng →
          </Link>
        </section>
      </main>
    </div>
  )
}

function Line({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <span className="text-gray-600">{label}</span>
        {hint && <span className="text-xs text-gray-400 ml-2">{hint}</span>}
      </div>
      <span className="font-bold text-gray-800">{value.toLocaleString('vi-VN')}đ</span>
    </div>
  )
}

function waterModeLabel(mode: string): string {
  if (mode === 'per_m3')     return 'Theo m³'
  if (mode === 'per_person') return 'Theo đầu người'
  return 'Cố định'
}

function labelForProofStatus(s: string): string {
  if (s === 'approved')           return 'Đã duyệt'
  if (s === 'rejected')           return 'Từ chối'
  if (s === 'partially_approved') return 'Duyệt 1 phần'
  return 'Chờ duyệt'
}

function BackIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
