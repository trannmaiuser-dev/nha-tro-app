import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getAllSettings } from '@/lib/db/settings'
import SettingsTabs from './components/SettingsTabs'
import type {
  UtilitiesSettingsInput,
  FeesSettingsInput,
  TimingSettingsInput,
  MiscSettingsInput,
} from '@/lib/schemas/settings'

export const dynamic = 'force-dynamic'

function asNumber(v: unknown, fallback: number): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }
  return fallback
}

function asBoolean(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v
  if (v === 'true') return true
  if (v === 'false') return false
  return fallback
}

function asString<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof v === 'string' && (allowed as readonly string[]).includes(v)) return v as T
  return fallback
}

export default async function AdminSettingsPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') redirect('/login')

  const settings = await getAllSettings()

  const utilities: UtilitiesSettingsInput = {
    electricity_rate_default: asNumber(settings.electricity_rate_default, 4000),
    water_billing_mode:       asString(settings.water_billing_mode, ['per_m3', 'per_person', 'fixed'] as const, 'per_m3'),
    water_rate_per_m3:        asNumber(settings.water_rate_per_m3, 15000),
    water_rate_per_person:    asNumber(settings.water_rate_per_person, 50000),
    water_rate_fixed:         asNumber(settings.water_rate_fixed, 100000),
  }

  const fees: FeesSettingsInput = {
    trash_fee_enabled:         asBoolean(settings.trash_fee_enabled, false),
    trash_fee_amount:          asNumber(settings.trash_fee_amount, 20000),
    parking_fee_enabled:       asBoolean(settings.parking_fee_enabled, false),
    parking_fee_per_vehicle:   asNumber(settings.parking_fee_per_vehicle, 100000),
    internet_fee_enabled:      asBoolean(settings.internet_fee_enabled, false),
    internet_fee_amount:       asNumber(settings.internet_fee_amount, 50000),
    over_capacity_fee_enabled: asBoolean(settings.over_capacity_fee_enabled, false),
    over_capacity_threshold:   asNumber(settings.over_capacity_threshold, 3),
    over_capacity_fee_amount:  asNumber(settings.over_capacity_fee_amount, 200000),
  }

  const timing: TimingSettingsInput = {
    meter_reading_day:           asNumber(settings.meter_reading_day, 1),
    payment_due_day:             asNumber(settings.payment_due_day, 5),
    overdue_warning_days:        asNumber(settings.overdue_warning_days, 7),
    overdue_remind_interval:     asNumber(settings.overdue_remind_interval, 5),
    debt_warning_threshold_days: asNumber(settings.debt_warning_threshold_days, 0),
  }

  const misc: MiscSettingsInput = {
    default_password_pattern: asString(
      settings.default_password_pattern,
      ['last_6_id_card', 'last_6_phone', 'random_6_digits'] as const,
      'last_6_id_card',
    ),
    data_retention_years: asNumber(settings.data_retention_years, 2),
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white pb-24">
      <header className="bg-white shadow-soft sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <Link href="/home" className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600">
              <BackIcon />
            </Link>
            <div>
              <h1 className="text-lg font-black text-gray-800">Cài đặt</h1>
              <p className="text-xs text-gray-400">Đơn giá điện nước, phí, thời gian</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6">
        <SettingsTabs utilities={utilities} fees={fees} timing={timing} misc={misc} />
      </main>
    </div>
  )
}

function BackIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
