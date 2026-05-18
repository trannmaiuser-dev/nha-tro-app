'use client'

import { useState, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'
import { sendGroupMessageAction } from '@/app/chat-groups/actions'
import type { GroupMessage } from '@/lib/db/chat-groups'

interface Props {
  groupId: string
  currentUserId: string
  currentUserName: string
  initialMessages: GroupMessage[]
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function GroupChatWindow({ groupId, currentUserId, currentUserName, initialMessages }: Props) {
  const [messages, setMessages] = useState<GroupMessage[]>(initialMessages)
  const [text, setText]         = useState('')
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll to bottom on mount + new messages
  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [messages.length])

  // Simple polling refresh (every 5s) — for 4-room scale; replace với Supabase Realtime sau
  useEffect(() => {
    const id = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/chat-groups/${groupId}/messages`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json() as GroupMessage[]
        if (data.length !== messages.length) setMessages(data)
      } catch {}
    }, 5000)
    return () => window.clearInterval(id)
  }, [groupId, messages.length])

  async function handleSend() {
    if (!text.trim() || sending) return
    setSending(true); setError(null)
    const optimistic: GroupMessage = {
      id:        'temp-' + Date.now(),
      sender_id: currentUserId,
      group_id:  groupId,
      content:   text.trim(),
      image_url: null,
      is_read:   false,
      created_at: new Date().toISOString(),
      sender:    { full_name: currentUserName },
    }
    setMessages(prev => [...prev, optimistic])
    setText('')
    const res = await sendGroupMessageAction(groupId, optimistic.content!)
    setSending(false)
    if (!res.success) {
      setError(res.error)
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-soft overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2" style={{ minHeight: '50vh' }}>
        {messages.length === 0 ? (
          <p className="text-center text-sm text-gray-400 italic py-10">Chưa có tin nhắn nào trong nhóm</p>
        ) : (
          messages.map(m => {
            const mine = m.sender_id === currentUserId
            const sender = Array.isArray(m.sender) ? m.sender[0] : m.sender
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${mine ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-800'}`}>
                  {!mine && <p className="text-xs font-bold opacity-80 mb-0.5">{sender?.full_name ?? '(?)'}</p>}
                  <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                  <p className={`text-[10px] mt-0.5 text-right ${mine ? 'text-primary-100' : 'text-gray-400'}`}>{fmtTime(m.created_at)}</p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="border-t p-3 flex gap-2 items-center">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Nhập tin nhắn..."
          disabled={sending}
          className="input-field flex-1 text-sm"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="btn-primary px-4 py-2 shrink-0"
        >
          <Send size={16} />
        </button>
      </div>

      {error && <p className="px-3 pb-2 text-xs text-red-500 font-bold">{error}</p>}
    </div>
  )
}
