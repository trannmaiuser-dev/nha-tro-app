// Supabase Edge Function: archive-old-tenants
// Schedule: Daily at 00:00 (cron: "0 0 * * *")
// Mục đích: Archive tenant đã chuyển đi > data_retention_years năm
//
// Deploy: supabase functions deploy archive-old-tenants
// Schedule: supabase functions schedule create archive-old-tenants --cron "0 0 * * *"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async () => {
  try {
    // Lấy cấu hình số năm lưu trữ
    const { data: setting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'data_retention_years')
      .single()

    const retentionYears = Number(setting?.value ?? 2)
    const cutoffDate     = new Date()
    cutoffDate.setFullYear(cutoffDate.getFullYear() - retentionYears)

    // Tìm tenant đã moved_out quá thời hạn lưu trữ
    // Dựa trên move_requests.reviewed_at (ngày được duyệt chuyển đi)
    const { data: oldRequests } = await supabase
      .from('move_requests')
      .select('user_id')
      .eq('status', 'approved')
      .lt('reviewed_at', cutoffDate.toISOString())

    if (!oldRequests?.length) {
      return new Response(JSON.stringify({ archived: 0, message: 'Không có tenant nào cần archive' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const userIds = oldRequests.map(r => r.user_id)

    // Archive: xóa thông tin nhạy cảm, giữ tên + SĐT (hash) + ngày chuyển đi
    const { count } = await supabase
      .from('users')
      .update({ tenant_status: 'archived' })
      .in('id', userIds)
      .eq('tenant_status', 'moved_out')

    // Xóa dữ liệu nhạy cảm trong tenant_profiles
    const { data: profiles } = await supabase
      .from('tenant_profiles')
      .select('id')
      .in('user_id', userIds)

    if (profiles?.length) {
      const profileIds = profiles.map(p => p.id)
      await supabase.from('tenant_profiles').update({
        cccd_number: null,
        dob:         null,
        address:     null,
        occupation:  null,
        avatar_url:  null,
      }).in('id', profileIds)

      // Xóa emergency contacts và documents (thông tin nhạy cảm)
      await supabase.from('emergency_contacts').delete().in('tenant_id', profileIds)
      await supabase.from('tenant_documents').delete().in('tenant_id', profileIds)
    }

    // Xóa tài khoản ngân hàng
    await supabase.from('tenant_bank_accounts').delete().in('user_id', userIds)

    console.log(`Archived ${count} tenants (cutoff: ${cutoffDate.toISOString()})`)

    return new Response(JSON.stringify({ archived: count, cutoffDate: cutoffDate.toISOString() }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Archive error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
