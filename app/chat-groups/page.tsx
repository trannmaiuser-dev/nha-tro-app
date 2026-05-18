import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { listGroupsForUser } from '@/lib/db/chat-groups'

export const dynamic = 'force-dynamic'

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export default async function ChatGroupsListPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const groups = await listGroupsForUser(user.userId)

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white pb-24">
      <header className="bg-white shadow-soft sticky top-0 z-30">
        <div className="max-w-md mx-auto flex items-center gap-3 px-5 py-4">
          <Link href={user.role === 'owner' ? '/dashboard' : '/home'} className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600">
            ‹
          </Link>
          <div>
            <h1 className="text-lg font-black text-gray-800">Nhóm chat</h1>
            <p className="text-xs text-gray-400">{groups.length} nhóm</p>
          </div>
          {user.role === 'owner' && (
            <Link
              href="/admin/chat-groups"
              className="ml-auto btn-secondary text-xs px-3 py-1"
            >
              Quản lý
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6 space-y-3">
        {groups.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-4xl mb-3">👥</p>
            <p className="font-bold text-gray-700">Bạn chưa ở nhóm chat nào</p>
            {user.role === 'owner' && (
              <p className="text-sm text-gray-400 mt-1">
                <Link href="/admin/chat-groups" className="text-primary-600 underline">Tạo nhóm mới</Link>
              </p>
            )}
          </div>
        ) : (
          groups.map(g => (
            <Link key={g.id} href={`/chat-groups/${g.id}`} className="card block hover:bg-primary-50 transition">
              <h3 className="font-black text-gray-800">{g.name}</h3>
              {g.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{g.description}</p>}
              <p className="text-xs text-gray-400 mt-1.5">
                {g.member_count} thành viên
                {g.last_message_at && ` · Hoạt động ${fmtDate(g.last_message_at)}`}
              </p>
            </Link>
          ))
        )}
      </main>
    </div>
  )
}
