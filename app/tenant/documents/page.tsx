import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getDocumentsForTenant } from '@/lib/db/documents'
import TenantDocumentsClient from './TenantDocumentsClient'

export const dynamic = 'force-dynamic'

export default async function TenantDocumentsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'tenant') redirect('/home')

  const documents = await getDocumentsForTenant(user.userId)

  return <TenantDocumentsClient documents={documents} />
}
