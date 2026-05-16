'use client'

import { useState } from 'react'
import UtilitiesSettingsForm from './UtilitiesSettingsForm'
import FeesSettingsForm from './FeesSettingsForm'
import TimingSettingsForm from './TimingSettingsForm'
import MiscSettingsForm from './MiscSettingsForm'
import type {
  UtilitiesSettingsInput,
  FeesSettingsInput,
  TimingSettingsInput,
  MiscSettingsInput,
} from '@/lib/schemas/settings'

interface Props {
  utilities: UtilitiesSettingsInput
  fees:      FeesSettingsInput
  timing:    TimingSettingsInput
  misc:      MiscSettingsInput
}

type Tab = 'utilities' | 'fees' | 'timing' | 'misc'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'utilities', label: 'Điện nước', icon: '⚡' },
  { id: 'fees',      label: 'Phí khác',  icon: '💰' },
  { id: 'timing',    label: 'Thời gian', icon: '📅' },
  { id: 'misc',      label: 'Khác',      icon: '⚙️' },
]

export default function SettingsTabs({ utilities, fees, timing, misc }: Props) {
  const [tab, setTab] = useState<Tab>('utilities')

  return (
    <div>
      {/* Tab bar */}
      <div className="bg-white rounded-2xl p-1.5 shadow-soft mb-4 flex gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-[80px] py-2.5 px-3 rounded-xl text-sm font-bold transition whitespace-nowrap ${
              tab === t.id
                ? 'bg-primary-500 text-white shadow-soft'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span className="mr-1">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {tab === 'utilities' && <UtilitiesSettingsForm defaults={utilities} />}
        {tab === 'fees'      && <FeesSettingsForm      defaults={fees} />}
        {tab === 'timing'    && <TimingSettingsForm    defaults={timing} />}
        {tab === 'misc'      && <MiscSettingsForm      defaults={misc} />}
      </div>
    </div>
  )
}
