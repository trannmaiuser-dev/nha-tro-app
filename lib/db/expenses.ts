import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { Expense, ExpenseType } from '@/types'

export interface CreateExpenseInput {
  room_id?:       string | null
  expense_type:   ExpenseType
  amount:         number
  description:    string
  expense_date:   string
  receipt_images: string[]
  created_by:     string | null
}

export interface ExpenseFilters {
  room_id?:      string
  expense_type?: ExpenseType
  date_from?:    string
  date_to?:      string
}

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('expenses')
    .insert({
      room_id:        input.room_id ?? null,
      expense_type:   input.expense_type,
      amount:         input.amount,
      description:    input.description,
      expense_date:   input.expense_date,
      receipt_images: input.receipt_images,
      created_by:     input.created_by,
    })
    .select('*, room:rooms(id, name)')
    .single()
  if (error) throw new Error('Không thể lưu chi phí: ' + error.message)
  return data
}

export async function getExpenses(filters: ExpenseFilters = {}): Promise<Expense[]> {
  const sb = createServerSupabaseClient()
  let q = sb
    .from('expenses')
    .select('*, room:rooms(id, name)')
    .order('expense_date', { ascending: false })

  if (filters.room_id)      q = q.eq('room_id', filters.room_id)
  if (filters.expense_type) q = q.eq('expense_type', filters.expense_type)
  if (filters.date_from)    q = q.gte('expense_date', filters.date_from)
  if (filters.date_to)      q = q.lte('expense_date', filters.date_to)

  const { data, error } = await q
  if (error) throw new Error('Không thể tải danh sách chi phí')
  return (data ?? []) as Expense[]
}

export async function updateExpense(id: string, patch: Partial<CreateExpenseInput>): Promise<Expense> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('expenses')
    .update(patch)
    .eq('id', id)
    .select('*, room:rooms(id, name)')
    .single()
  if (error) throw new Error('Không thể cập nhật chi phí')
  return data
}

export async function deleteExpense(id: string): Promise<void> {
  const sb = createServerSupabaseClient()
  const { error } = await sb.from('expenses').delete().eq('id', id)
  if (error) throw new Error('Không thể xóa chi phí')
}
