import { createServerSupabaseClient } from '@/lib/supabase-server'

export type SettingValue = string | number | boolean

export async function getSetting<T = SettingValue>(key: string): Promise<T | null> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  if (error || !data) return null
  return data.value as T
}

export async function setSetting(key: string, value: SettingValue): Promise<void> {
  const sb = createServerSupabaseClient()
  const { error } = await sb
    .from('app_settings')
    .upsert({ key, value }, { onConflict: 'key' })
  if (error) throw new Error(`Không thể lưu cài đặt "${key}"`)
}

export async function getAllSettings(): Promise<Record<string, SettingValue>> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('app_settings')
    .select('key, value')
  if (error) throw new Error('Không thể tải cài đặt')
  const result: Record<string, SettingValue> = {}
  for (const row of data ?? []) {
    result[row.key] = row.value as SettingValue
  }
  return result
}

export async function updateMultipleSettings(updates: Record<string, SettingValue>): Promise<void> {
  const sb = createServerSupabaseClient()
  const rows = Object.entries(updates).map(([key, value]) => ({ key, value }))
  const { error } = await sb
    .from('app_settings')
    .upsert(rows, { onConflict: 'key' })
  if (error) throw new Error('Không thể lưu cài đặt')
}
