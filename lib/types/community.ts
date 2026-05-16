/**
 * Raw row từ Supabase bảng `community_events`.
 * Một số cột (`creator_id`, `response_option_*`, `deleted_at`, `tags`) được thêm
 * bởi `migrations-v8`. Nếu DB chưa migrate, các cột này có thể vắng mặt →
 * dùng optional + default ở chỗ normalize.
 */
export interface RawCommunityEventRow {
  id:                   string
  title:                string
  description:          string | null
  event_date:           string
  creator_id?:          string | null
  response_option_yes?: string | null
  response_option_no?:  string | null
  deleted_at?:          string | null
  tags?:                unknown[]
  creator?:             { id: string; full_name: string } | null
  responses?:           Array<{
    user_id:  string
    response: string
    user?:    { full_name: string } | null
  }>
}

/**
 * Shape đúng mà `components/CommunityPage.tsx` (interface `Event` local) cần.
 * Dùng làm target type khi cast sau khi normalize.
 *
 * NOTE: `creator` non-null là giả định runtime (Supabase join trả về object nếu
 * FK hợp lệ). Trước đây code dùng kiểu lỏng để bypass; T-014c giữ nguyên runtime
 * behavior và chỉ khóa lại type ở boundary này.
 */
export interface CommunityEventForUI {
  id:                  string
  title:               string
  description:         string | null
  event_date:          string
  creator_id:          string
  creator:             { full_name: string }
  response_option_yes: string
  response_option_no:  string
  deleted_at:          string | null
  responses: Array<{ user_id: string; response: string; user: { full_name: string } }>
  tags:      Array<{ user_id: string; user: { id: string; full_name: string } }>
}
