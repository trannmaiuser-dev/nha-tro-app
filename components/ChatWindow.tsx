'use client'

import Image from 'next/image'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { AuthPayload, Message } from '@/types'
import { ChevronLeft, Send, ImagePlus, Loader2 } from 'lucide-react'

interface Partner { id: string; full_name: string; role: string }
interface Tenant  { id: string; full_name: string }

interface Props {
  currentUser:     AuthPayload
  partner:         Partner | null
  tenants:         Tenant[]
  initialMessages: Message[]
}

export default function ChatWindow({ currentUser, partner: initialPartner, tenants, initialMessages }: Props) {
  const router  = useRouter()
  const [partner,    setPartner]    = useState<Partner | null>(initialPartner)
  const [messages,   setMessages]   = useState<Message[]>(initialMessages)
  const [text,       setText]       = useState('')
  const [sending,    setSending]    = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const [showTenants, setShowTenants] = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const fileRef    = useRef<HTMLInputElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Supabase Realtime subscription
  useEffect(() => {
    if (!partner) return
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const channel = supabase
      .channel(`chat:${[currentUser.userId, partner.id].sort().join('-')}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'messages',
          filter: `receiver_id=eq.${currentUser.userId}`,
        },
        (payload) => {
          const msg = payload.new as Message
          if (msg.sender_id !== partner.id) return
          setMessages(prev => [...prev, msg])
          // Mark as read
          fetch('/api/messages/read', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ senderId: partner.id }),
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [partner, currentUser.userId])

  const switchTenant = useCallback(async (tenant: Tenant) => {
    setShowTenants(false)
    setPartner({ ...tenant, role: 'tenant' })
    const res = await fetch(`/api/messages/list?with=${tenant.id}`)
    const data = await res.json()
    setMessages(Array.isArray(data) ? data : [])
    await fetch('/api/messages/read', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ senderId: tenant.id }),
    })
  }, [])

  async function sendText() {
    if (!text.trim() || !partner || sending) return
    const content = text.trim()
    setText('')
    setSending(true)
    try {
      const res = await fetch('/api/messages/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ receiverId: partner.id, content }),
      })
      const msg = await res.json()
      if (msg.id) setMessages(prev => [...prev, msg])
    } finally {
      setSending(false)
    }
  }

  async function sendImage(file: File) {
    if (!partner || uploading) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const upRes = await fetch('/api/upload/image', { method: 'POST', body: form })
      const { url, error } = await upRes.json()
      if (error) { alert(error); return }

      const res = await fetch('/api/messages/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ receiverId: partner.id, imageUrl: url }),
      })
      const msg = await res.json()
      if (msg.id) setMessages(prev => [...prev, msg])
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-soft z-20 safe-top">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-gray-600 active:scale-95 transition-all">
            <ChevronLeft size={22} strokeWidth={2} />
          </button>

          {currentUser.role === 'owner' && tenants.length > 1 ? (
            <button
              onClick={() => setShowTenants(!showTenants)}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              <Avatar name={partner?.full_name ?? '?'} />
              <div className="text-left min-w-0">
                <p className="font-black text-gray-800 truncate">{partner?.full_name ?? 'Chọn khách thuê'}</p>
                <p className="text-xs text-gray-400">Khách thuê · nhấn để đổi</p>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Avatar name={partner?.full_name ?? '?'} />
              <div className="min-w-0">
                <p className="font-black text-gray-800 truncate">{partner?.full_name ?? '...'}</p>
                <p className="text-xs text-primary-500">
                  {partner?.role === 'owner' ? 'Chủ nhà' : 'Khách thuê'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tenant switcher dropdown */}
        {showTenants && (
          <div className="absolute top-full left-0 right-0 bg-white shadow-float z-30 border-t border-gray-100">
            {tenants.map(t => (
              <button
                key={t.id}
                onClick={() => switchTenant(t)}
                className={`w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors ${
                  t.id === partner?.id ? 'bg-primary-50' : ''
                }`}
              >
                <Avatar name={t.full_name} size="sm" />
                <span className={`font-semibold text-sm ${t.id === partner?.id ? 'text-primary-600' : 'text-gray-700'}`}>
                  {t.full_name}
                </span>
                {t.id === partner?.id && <span className="ml-auto text-primary-400 text-xs">✓</span>}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full">
        {!partner ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <p className="text-4xl">💬</p>
            <p className="font-medium">Chọn khách thuê để nhắn tin</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <p className="text-4xl">👋</p>
            <p className="font-medium">Chưa có tin nhắn nào</p>
            <p className="text-sm">Hãy gửi lời chào đầu tiên!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, i) => {
              const isMine  = msg.sender_id === currentUser.userId
              const showDate = i === 0 || !sameDay(messages[i - 1].created_at, msg.created_at)
              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="text-center my-3">
                      <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                        {formatDate(msg.created_at)}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
                    <div
                      className={`max-w-[75%] rounded-3xl px-4 py-2.5 ${
                        isMine
                          ? 'bg-primary-600 text-white rounded-br-sm'
                          : 'bg-white shadow-card text-gray-800 rounded-bl-sm'
                      }`}
                    >
                      {msg.image_url && (
                        <a href={msg.image_url} target="_blank" rel="noopener noreferrer">
                          <Image
                            src={msg.image_url}
                            alt="ảnh"
                            width={400}
                            height={240}
                            className="rounded-2xl max-w-full max-h-60 object-cover mb-1"
                          />
                        </a>
                      )}
                      {msg.content && (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                      )}
                      <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-primary-200' : 'text-gray-300'}`}>
                        {formatTime(msg.created_at)}
                        {isMine && <span className="ml-1">{msg.is_read ? '✓✓' : '✓'}</span>}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 safe-bottom">
        <div className="max-w-lg mx-auto flex items-end gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading || !partner}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-100 text-gray-500 shrink-0 active:scale-95 transition-all disabled:opacity-40"
          >
            {uploading ? <Loader2 size={18} strokeWidth={2} className="animate-spin" /> : <ImagePlus size={18} strokeWidth={1.5} />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) sendImage(f); e.target.value = '' }}
          />
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText() } }}
            placeholder="Nhắn tin..."
            rows={1}
            disabled={!partner}
            className="flex-1 resize-none bg-gray-100 rounded-2xl px-4 py-2.5 text-sm font-medium
                       focus:outline-none focus:ring-2 focus:ring-primary-300 focus:bg-white
                       placeholder:text-gray-300 transition-all max-h-32 disabled:opacity-40"
          />
          <button
            onClick={sendText}
            disabled={!text.trim() || sending || !partner}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary-600 text-white shrink-0
                       active:scale-95 transition-all disabled:opacity-40"
          >
            {sending ? <Loader2 size={18} strokeWidth={2} className="animate-spin" /> : <Send size={16} strokeWidth={2} />}
          </button>
        </div>
      </div>
    </div>
  )
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base'
  return (
    <div className={`${cls} rounded-full bg-primary-100 text-primary-600 font-black flex items-center justify-center shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Hôm nay'
  const yest = new Date(today); yest.setDate(yest.getDate() - 1)
  if (d.toDateString() === yest.toDateString()) return 'Hôm qua'
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

