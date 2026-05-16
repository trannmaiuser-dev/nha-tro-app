import { NextResponse } from 'next/server'

export const revalidate = 900 // cache 15 min server-side

export async function GET() {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch('https://wttr.in/Hanoi?format=j1', {
      signal: controller.signal,
      headers: { 'User-Agent': 'curl/7.88.1' }, // wttr.in returns JSON reliably with curl UA
    })
    clearTimeout(timeout)

    if (!res.ok) throw new Error(`wttr.in ${res.status}`)

    const d = await res.json()
    const c = d.current_condition?.[0]

    return NextResponse.json({
      temp: c?.temp_C ?? '--',
      desc: c?.weatherDesc?.[0]?.value ?? '',
    })
  } catch {
    return NextResponse.json({ temp: '--', desc: 'Không tải được' })
  }
}
