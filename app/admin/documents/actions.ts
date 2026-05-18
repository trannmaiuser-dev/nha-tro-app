'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createDocument, deleteDocument } from '@/lib/db/documents'

type Result<T = void> = { success: true; data: T } | { success: false; error: string }

const MAX_FILE_SIZE = 10 * 1024 * 1024  // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic']

async function verifyOwner() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') throw new Error('Không có quyền')
  return user
}

/**
 * T-033 Upload document via FormData server action.
 *
 * Form fields:
 *   - file: File (PDF or image, max 10MB)
 *   - name: string (tên hiển thị)
 *   - category_id: string (UUID category)
 *   - room_id: string | '' (UUID room hoặc empty cho building-wide)
 *   - tenant_id: string | '' (UUID tenant hoặc empty)
 */
export async function uploadDocumentAction(formData: FormData): Promise<Result<{ id: string }>> {
  try {
    const user = await verifyOwner()

    const file        = formData.get('file') as File | null
    const name        = (formData.get('name') as string ?? '').trim()
    const categoryId  = (formData.get('category_id') as string ?? '').trim()
    const roomId      = (formData.get('room_id') as string ?? '').trim()
    const tenantId    = (formData.get('tenant_id') as string ?? '').trim()

    // Validate
    if (!file)               return { success: false, error: 'Vui lòng chọn file' }
    if (!name)               return { success: false, error: 'Vui lòng nhập tên giấy tờ' }
    if (!categoryId)         return { success: false, error: 'Vui lòng chọn danh mục' }
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: `File quá lớn (tối đa ${MAX_FILE_SIZE / 1024 / 1024}MB)` }
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { success: false, error: 'Loại file không hỗ trợ. Chỉ chấp nhận PDF, JPG, PNG, WebP, HEIC.' }
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    if (!ALLOWED_EXT.includes(ext)) {
      return { success: false, error: 'Đuôi file không hỗ trợ' }
    }

    // Upload storage
    const pathPrefix = roomId ? `room/${roomId}` : 'general'
    const storagePath = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const buf = Buffer.from(await file.arrayBuffer())

    const sb = createServerSupabaseClient()
    const { error: uploadError } = await sb.storage
      .from('documents')
      .upload(storagePath, buf, { contentType: file.type, upsert: false })
    if (uploadError) {
      return { success: false, error: 'Upload file thất bại: ' + uploadError.message }
    }

    // Insert DB row
    const doc = await createDocument({
      category_id: categoryId,
      room_id:     roomId || null,
      tenant_id:   tenantId || null,
      name,
      file_url:    storagePath,
      file_type:   ext,
      file_size:   file.size,
      uploaded_by: user.userId,
    })

    revalidatePath('/admin/documents')
    return { success: true, data: { id: doc.id } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Upload thất bại' }
  }
}

export async function deleteDocumentAction(id: string): Promise<Result> {
  try {
    await verifyOwner()
    await deleteDocument(id)
    revalidatePath('/admin/documents')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Xóa thất bại' }
  }
}

/**
 * Lấy signed URL 24h cho download/view document.
 * Client gọi action này khi user click "Xem" để tránh expose path trực tiếp.
 */
export async function getDocumentUrlAction(filePath: string): Promise<Result<{ url: string }>> {
  try {
    await verifyOwner()
    const sb = createServerSupabaseClient()
    const { data, error } = await sb.storage.from('documents').createSignedUrl(filePath, 86400)
    if (error || !data) return { success: false, error: 'Không tạo được link xem' }
    return { success: true, data: { url: data.signedUrl } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi' }
  }
}
