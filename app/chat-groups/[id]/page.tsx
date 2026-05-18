import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { getGroupForUser, getMessagesForGroup } from '@/lib/db/chat-groups'
import GroupChatWindow from '@/components/chat/GroupChatWindow'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { id: string }
}

export default async function GroupChatPage({ params }: PageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const ctx = await getGroupForUser(params.id, user.userId)
  if (!ctx) notFound()

  const messages = await getMessagesForGroup(params.id, 200)

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex flex-col">
      <header className="bg-white shadow-soft sticky top-0 z-30">
        <div className="max-w-md mx-auto flex items-center gap-3 px-5 py-4">
          <Link href="/chat-groups" className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600">‹</Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-black text-gray-800 truncate">{ctx.group.name}</h1>
            <p className="text-xs text-gray-400">{ctx.members.length} thành viên</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-4 flex flex-col">
        <GroupChatWindow
          groupId={params.id}
          currentUserId={user.userId}
          currentUserName={user.fullName}
          initialMessages={messages}
        />
      </main>
    </div>
  )
}
