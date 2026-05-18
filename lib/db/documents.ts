/**
 * Data layer cho Module 3 Giấy tờ (T-033).
 *
 * Convention (theo D5 T-003):
 *   - createServerSupabaseClient
 *   - throw Error tiếng Việt; server action layer wrap Result<T>
 *   - Soft delete qua `deleted_at` column
 */
import { createServerSupabaseClient } from '@/lib/supabase-server'

export interface DocumentCategory {
  id:             string
  name:           string
  description:    string | null
  system_default: boolean
  created_at:     string
}

export interface DocumentRow {
  id:           string
  category_id:  string | null
  room_id:      string | null
  tenant_id:    string | null
  name:         string
  file_url:     string
  file_type:    string | null
  file_size:    number | null
  uploaded_by:  string | null
  uploaded_at:  string
  deleted_at:   string | null
}

export interface DocumentWithJoins extends DocumentRow {
  category?: Pick<DocumentCategory, 'id' | 'name'> | null
  room?:     { id: string; name: string; floor: number } | null
  tenant?:   { id: string; full_name: string; phone: string } | null
}

// ─── Categories ─────────────────────────────────────────────

export async function getAllCategories(): Promise<DocumentCategory[]> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('document_categories')
    .select('*')
    .order('system_default', { ascending: false })  // system first
    .order('name', { ascending: true })
  if (error) throw new Error('Không thể tải danh mục giấy tờ')
  return (data ?? []) as DocumentCategory[]
}

// ─── Documents CRUD ─────────────────────────────────────────

export interface DocumentCreateInput {
  category_id: string | null
  room_id?:    string | null
  tenant_id?:  string | null
  name:        string
  file_url:    string
  file_type?:  string | null
  file_size?:  number | null
  uploaded_by: string
}

export async function createDocument(input: DocumentCreateInput): Promise<DocumentRow> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('documents')
    .insert({
      category_id: input.category_id,
      room_id:     input.room_id   ?? null,
      tenant_id:   input.tenant_id ?? null,
      name:        input.name,
      file_url:    input.file_url,
      file_type:   input.file_type ?? null,
      file_size:   input.file_size ?? null,
      uploaded_by: input.uploaded_by,
    })
    .select()
    .single()
  if (error) throw new Error('Không thể lưu giấy tờ: ' + error.message)
  return data as DocumentRow
}

/**
 * Lấy tất cả documents active (chưa soft-delete), sort by uploaded_at DESC.
 * Join category + room + tenant info cho UI list.
 */
export async function getAllDocuments(): Promise<DocumentWithJoins[]> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('documents')
    .select(`
      id, category_id, room_id, tenant_id, name, file_url, file_type, file_size,
      uploaded_by, uploaded_at, deleted_at,
      category:document_categories!category_id(id, name),
      room:rooms!room_id(id, name, floor),
      tenant:users!tenant_id(id, full_name, phone)
    `)
    .is('deleted_at', null)
    .order('uploaded_at', { ascending: false })
  if (error) throw new Error('Không thể tải danh sách giấy tờ')
  return (data ?? []) as unknown as DocumentWithJoins[]
}

/** Soft delete (set deleted_at). KHÔNG xóa file trong storage để recovery được. */
export async function deleteDocument(id: string): Promise<void> {
  const sb = createServerSupabaseClient()
  const { error } = await sb
    .from('documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error('Không thể xóa giấy tờ')
}

/**
 * Lấy signed URL 24h cho 1 document. File path stored ở file_url column.
 * Best-effort: lỗi storage → throw để UI hiển thị.
 */
export async function getDocumentSignedUrl(filePath: string): Promise<string> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb.storage.from('documents').createSignedUrl(filePath, 86400)
  if (error || !data) throw new Error('Không thể tạo link xem file: ' + (error?.message ?? 'unknown'))
  return data.signedUrl
}
