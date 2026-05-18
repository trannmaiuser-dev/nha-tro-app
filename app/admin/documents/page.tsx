import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAllDocuments, getAllCategories } from '@/lib/db/documents'
import DocumentsClient from './DocumentsClient'

// T-033: force-dynamic vì cookie + revalidatePath từ actions
export const dynamic = 'force-dynamic'

export default async function DocumentsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'owner') redirect('/dashboard')

  const sb = createServerSupabaseClient()
  const [categories, documents, roomsRes, tenantsRes] = await Promise.all([
    getAllCategories(),
    getAllDocuments(),
    sb.from('rooms').select('id, name, floor').order('name'),
    sb.from('users').select('id, full_name, phone').eq('role', 'tenant').order('full_name'),
  ])

  return (
    <DocumentsClient
      categories={categories}
      documents={documents}
      rooms={(roomsRes.data ?? []) as { id: string; name: string; floor: number }[]}
      tenants={(tenantsRes.data ?? []) as { id: string; full_name: string; phone: string }[]}
    />
  )
}
