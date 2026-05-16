import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { PaymentProof } from '@/types'
import { notifyOwner, notifyUser } from './notifications'

function formatVnd(n: number): string {
  return n.toLocaleString('vi-VN') + ' đ'
}

export interface CreateProofInput {
  invoice_id:      string
  tenant_id:       string
  amount_reported: number
  proof_images:    string[]
  note?:           string | null
}

export async function createPaymentProof(input: CreateProofInput): Promise<PaymentProof> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('payment_proofs')
    .insert({
      invoice_id:      input.invoice_id,
      tenant_id:       input.tenant_id,
      amount_reported: input.amount_reported,
      proof_images:    input.proof_images,
      note:            input.note ?? null,
      status:          'pending',
    })
    .select()
    .single()
  if (error) throw new Error('Không thể gửi bằng chứng: ' + error.message)

  const { data: inv } = await sb
    .from('invoices')
    .select('month, year, room:rooms(name)')
    .eq('id', input.invoice_id)
    .maybeSingle()
  const { data: tenant } = await sb
    .from('users')
    .select('full_name, phone')
    .eq('id', input.tenant_id)
    .maybeSingle()
  const roomName   = (inv as { room?: { name?: string } } | null)?.room?.name ?? 'phòng'
  const tenantName = tenant?.full_name ?? tenant?.phone ?? 'Khách'
  const period     = inv ? `tháng ${inv.month}/${inv.year}` : 'hóa đơn'
  await notifyOwner(input.tenant_id, {
    type:    'payment_reported',
    message: `${tenantName} (${roomName}) đã báo thanh toán ${period}: ${formatVnd(input.amount_reported)}`,
  })

  return data
}

export async function getPaymentProofsByInvoice(invoiceId: string): Promise<PaymentProof[]> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('payment_proofs')
    .select('*, tenant:users!tenant_id(id, full_name, phone)')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false })
  if (error) throw new Error('Không thể tải bằng chứng')
  return (data ?? []) as PaymentProof[]
}

export async function getPaymentProofsByTenant(tenantId: string): Promise<PaymentProof[]> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('payment_proofs')
    .select('*, invoice:invoices(id, month, year, total, paid_amount, room:rooms(id, name))')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  if (error) throw new Error('Không thể tải bằng chứng')
  return (data ?? []) as PaymentProof[]
}

export async function getPendingProofs(): Promise<PaymentProof[]> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('payment_proofs')
    .select('*, tenant:users!tenant_id(id, full_name, phone), invoice:invoices(id, month, year, total, paid_amount, room:rooms(id, name))')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw new Error('Không thể tải hàng đợi')
  return (data ?? []) as PaymentProof[]
}

export async function getAllProofs(status?: string): Promise<PaymentProof[]> {
  const sb = createServerSupabaseClient()
  let q = sb
    .from('payment_proofs')
    .select('*, tenant:users!tenant_id(id, full_name, phone), invoice:invoices(id, month, year, total, paid_amount, room:rooms(id, name))')
    .order('created_at', { ascending: false })
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) throw new Error('Không thể tải bằng chứng')
  return (data ?? []) as PaymentProof[]
}

/**
 * Approve a payment proof and add the approved amount to invoice.paid_amount.
 * If amountApproved < amount_reported: status=partially_approved.
 *
 * NOTE: paid_amount tăng theo amountApproved, KHÔNG phải amount_reported.
 * Trigger DB sẽ tự update invoice.status (paid / partially_paid).
 */
export async function approvePaymentProof(
  proofId: string,
  amountApproved: number | undefined,
  reviewerId: string,
): Promise<void> {
  const sb = createServerSupabaseClient()

  const { data: proof, error: fetchErr } = await sb
    .from('payment_proofs')
    .select('id, invoice_id, tenant_id, amount_reported, status')
    .eq('id', proofId)
    .single()
  if (fetchErr || !proof) throw new Error('Không tìm thấy bằng chứng')
  if (proof.status !== 'pending') throw new Error('Bằng chứng này đã được xử lý')

  const finalApproved = amountApproved ?? proof.amount_reported
  if (finalApproved <= 0) throw new Error('Số tiền duyệt phải lớn hơn 0')
  const isPartial = finalApproved < proof.amount_reported

  // Update invoice.paid_amount (RPC-like: re-fetch + update)
  const { data: inv, error: invErr } = await sb
    .from('invoices')
    .select('id, total, paid_amount, month, year, room:rooms(name)')
    .eq('id', proof.invoice_id)
    .single()
  if (invErr || !inv) throw new Error('Không tìm thấy hóa đơn')

  const newPaid = inv.paid_amount + finalApproved

  const { error: updInvErr } = await sb
    .from('invoices')
    .update({ paid_amount: newPaid })
    .eq('id', inv.id)
  if (updInvErr) throw new Error('Không thể cập nhật hóa đơn: ' + updInvErr.message)

  const { error: updProofErr } = await sb
    .from('payment_proofs')
    .update({
      status:          isPartial ? 'partially_approved' : 'approved',
      amount_approved: finalApproved,
      reviewed_by:     reviewerId,
      reviewed_at:     new Date().toISOString(),
    })
    .eq('id', proofId)
  if (updProofErr) throw new Error('Không thể cập nhật bằng chứng: ' + updProofErr.message)

  const roomName = (inv as { room?: { name?: string } }).room?.name ?? 'phòng'
  const period   = `tháng ${inv.month}/${inv.year}`
  const message = isPartial
    ? `Hóa đơn ${roomName} ${period} đã duyệt 1 phần: ${formatVnd(finalApproved)} / ${formatVnd(proof.amount_reported)}`
    : `Hóa đơn ${roomName} ${period} đã được xác nhận thanh toán: ${formatVnd(finalApproved)}`
  await notifyUser(reviewerId, proof.tenant_id, {
    type: 'payment_confirmed',
    message,
  })
}

export async function rejectPaymentProof(
  proofId: string,
  rejectionNote: string,
  reviewerId: string,
): Promise<void> {
  const sb = createServerSupabaseClient()
  const { data: proof, error: fetchErr } = await sb
    .from('payment_proofs')
    .select('id, status, tenant_id, invoice_id')
    .eq('id', proofId)
    .single()
  if (fetchErr || !proof) throw new Error('Không tìm thấy bằng chứng')
  if (proof.status !== 'pending') throw new Error('Bằng chứng này đã được xử lý')

  const { error } = await sb
    .from('payment_proofs')
    .update({
      status:         'rejected',
      rejection_note: rejectionNote,
      reviewed_by:    reviewerId,
      reviewed_at:    new Date().toISOString(),
    })
    .eq('id', proofId)
  if (error) throw new Error('Không thể từ chối: ' + error.message)

  const { data: inv } = await sb
    .from('invoices')
    .select('month, year, room:rooms(name)')
    .eq('id', proof.invoice_id)
    .maybeSingle()
  const roomName = (inv as { room?: { name?: string } } | null)?.room?.name ?? 'phòng'
  const period   = inv ? `tháng ${inv.month}/${inv.year}` : 'hóa đơn'
  await notifyUser(reviewerId, proof.tenant_id, {
    type:    'payment_rejected',
    message: `Báo thanh toán ${roomName} ${period} bị từ chối. Lý do: ${rejectionNote}`,
  })
}

/**
 * Tìm invoice cho tenant của 1 tháng cụ thể.
 * Tenant chọn tháng → tự động map đến invoice của phòng họ ở.
 */
export async function findInvoiceForTenantMonth(
  tenantId: string, month: number, year: number,
): Promise<{ id: string; total: number; paid_amount: number } | null> {
  const sb = createServerSupabaseClient()
  // Lấy phòng của tenant
  const { data: rooms } = await sb
    .from('rooms')
    .select('id')
    .eq('tenant_id', tenantId)
  if (!rooms || rooms.length === 0) return null
  const roomIds = rooms.map(r => r.id)

  const { data: inv } = await sb
    .from('invoices')
    .select('id, total, paid_amount')
    .in('room_id', roomIds)
    .eq('month', month).eq('year', year)
    .maybeSingle()
  return inv ?? null
}
