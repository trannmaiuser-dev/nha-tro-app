import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { getCurrentUser } from '@/lib/auth'
import { getInvoiceById } from '@/lib/db/invoices'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import InvoicePDF from '@/lib/pdf/InvoicePDF'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const invoice = await getInvoiceById(params.id)
  if (!invoice) return NextResponse.json({ error: 'Không tìm thấy hóa đơn' }, { status: 404 })

  // T-016b: lấy primary tenant qua room_tenants (rooms.tenant_id đã drop).
  let tenantName: string | null = null
  if (invoice.room?.id) {
    const sb = createServerSupabaseClient()
    const { data } = await sb
      .from('room_tenants')
      .select('user:users!user_id(full_name)')
      .eq('room_id', invoice.room.id)
      .eq('is_primary', true)
      .is('left_at', null)
      .maybeSingle()
    const tenant = data?.user as unknown as { full_name?: string } | null
    tenantName = tenant?.full_name ?? null
  }

  const element = React.createElement(InvoicePDF, { invoice, tenantName }) as React.ReactElement<DocumentProps>
  const buf = await renderToBuffer(element)

  const roomName = (invoice.room?.name ?? 'phong').replace(/\s+/g, '-').toLowerCase()
  const filename = `hoa-don-phong-${roomName}-thang-${invoice.month}-${invoice.year}.pdf`

  // Wrap Buffer in Blob to satisfy NextResponse BodyInit typing on TS 5.x
  const blob = new Blob([new Uint8Array(buf)], { type: 'application/pdf' })

  return new NextResponse(blob, {
    status: 200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      buf.byteLength.toString(),
    },
  })
}
