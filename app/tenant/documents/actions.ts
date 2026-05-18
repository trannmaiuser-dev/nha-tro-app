'use server'

import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { assertDocumentBelongsToTenant } from '@/lib/db/documents'

type Result<T = void> = { success: true; data: T } | { success: false; error: string }

async function verifyTenant() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'tenant') throw new Error('Không có quyền')
  return user
}

/**
 * T-034 Tenant click "Xem" → verify ownership → signed URL.
 *
 * Security: KHÔNG dùng action chung với admin (getDocumentUrlAction).
 * Action này force verify doc thuộc về tenant trước khi tạo URL → tránh hack
 * doc_id của tenant khác.
 */
export async function getTenantDocumentUrlAction(docId: string): Promise<Result<{ url: string }>> {
  try {
    const user = await verifyTenant()
    const doc = await assertDocumentBelongsToTenant(docId, user.userId)

    const sb = createServerSupabaseClient()
    const { data, error } = await sb.storage.from('documents').createSignedUrl(doc.file_url, 86400)
    if (error || !data) return { success: false, error: 'Không tạo được link xem' }
    return { success: true, data: { url: data.signedUrl } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi' }
  }
}
