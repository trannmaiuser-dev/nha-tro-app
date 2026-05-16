'use client'

import { useRouter } from 'next/navigation'

interface Props {
  month:    number
  year:     number
  basePath: string
}

export default function MonthSelector({ month, year, basePath }: Props) {
  const router = useRouter()

  function go(m: number, y: number) {
    router.push(`${basePath}?month=${m}&year=${y}`)
  }

  function prev() {
    if (month === 1) go(12, year - 1)
    else go(month - 1, year)
  }
  function next() {
    if (month === 12) go(1, year + 1)
    else go(month + 1, year)
  }

  return (
    <div className="flex items-center gap-2 bg-white rounded-xl shadow-soft px-3 py-2">
      <button onClick={prev} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500" type="button">
        ◀
      </button>
      <div className="font-bold text-gray-700 min-w-[7rem] text-center">
        Tháng {month}/{year}
      </div>
      <button onClick={next} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500" type="button">
        ▶
      </button>
    </div>
  )
}
