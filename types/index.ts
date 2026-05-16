export type UserRole = 'owner' | 'tenant'

export interface User {
  id: string
  phone: string
  role: UserRole
  full_name: string
  push_subscription?: string | null
  webauthn_credential_id?: string | null
  webauthn_public_key?: string | null
  webauthn_counter?: number | null
}

export type RoomStatus = 'vacant' | 'occupied' | 'maintenance'

export interface Room {
  id: string
  name: string
  floor: number
  price: number
  deposit: number
  status: RoomStatus
  note: string | null
  tenant_id: string | null
  /** Đơn giá điện VND/kWh riêng cho phòng. null = dùng default từ app_settings. */
  electricity_rate: number | null
  tenant?: User | null
  created_at?: string
}

export interface RoomInput {
  name: string
  floor: number
  price: number
  deposit: number
  status: RoomStatus
  note?: string | null
  /** VND/kWh. null = dùng default từ app_settings */
  electricity_rate?: number | null
}

export type NotificationType =
  | 'payment_reminder'
  | 'payment_reported'
  | 'payment_confirmed'
  | 'payment_rejected'
  | 'extension_request'
  | 'extension_approved'
  | 'extension_rejected'

export interface AppNotification {
  id: string
  sender_id: string
  receiver_id: string
  type: NotificationType
  message: string
  status: 'pending' | 'read' | 'accepted' | 'rejected'
  created_at: string
  sender?: Pick<User, 'full_name' | 'phone'>
}

export interface Payment {
  id: string
  room_id: string
  amount: number
  due_date: string
  paid_date: string | null
  status: 'pending' | 'paid' | 'overdue' | 'extended'
  created_at: string
}

export interface Message {
  id:          string
  sender_id:   string
  receiver_id: string
  content:     string | null
  image_url:   string | null
  is_read:     boolean
  created_at:  string
}

export interface TenantProfile {
  id:             string
  user_id:        string
  full_name:      string | null
  dob:            string | null
  gender:         'male' | 'female' | 'other' | null
  cccd_number:    string | null
  address:        string | null
  occupation:     string | null
  avatar_url:     string | null
  profile_status: 'draft' | 'pending' | 'confirmed'
  created_at:     string
  updated_at:     string
}

export interface EmergencyContact {
  id?:          string
  relationship: string
  full_name:    string
  gender?:      string | null
  dob?:         string | null
  phone:        string
  address?:     string | null
  avatar_url?:  string | null
}

export interface RelatedPerson {
  id?:          string
  relationship: string
  full_name:    string
  phone:        string
  avatar_url:   string | null
  gender:       string
  dob:          string
}

export interface TenantDocument {
  id?:         string
  type:        'cccd_front' | 'cccd_back' | 'contract' | 'custom'
  custom_name?: string
  file_url:    string
  file_type:   string
}

export interface AuthPayload {
  userId: string
  phone: string
  role: UserRole
  fullName: string
  isProfileComplete?: boolean
}

// ─── Tenant status (UC-03, UC-07) ────────────────────────────
export type TenantStatus = 'invited' | 'active' | 'pending_move' | 'moved_out' | 'archived'

export interface TenantBankAccount {
  id:             string
  user_id:        string
  bank_name:      string
  account_number: string
  account_holder: string
  created_at:     string
}

export type MoveRequestStatus = 'pending' | 'approved' | 'rejected'

export interface MoveRequest {
  id:             string
  user_id:        string
  room_id:        string
  requested_date: string
  reason:         string | null
  status:         MoveRequestStatus
  reviewed_by:    string | null
  reviewed_at:    string | null
  rejection_note: string | null
  created_at:     string
  user?:          Pick<User, 'id' | 'full_name' | 'phone'>
  room?:          Pick<Room, 'id' | 'name' | 'floor'>
}

export interface Guest {
  id:               string
  tenant_id:        string
  room_id:          string
  guest_name:       string
  number_of_nights: number
  note:             string | null
  created_at:       string
  tenant?:          Pick<User, 'id' | 'full_name' | 'phone'>
  room?:            Pick<Room, 'id' | 'name'>
}

// ─── Module Thu chi (T-011+) ────────────────────────────────

export type WaterBillingMode = 'per_m3' | 'per_person' | 'fixed'

export type InvoiceStatus = 'unpaid' | 'partially_paid' | 'paid'

export type PaymentProofStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'partially_approved'

export type ExpenseType =
  | 'repair'
  | 'maintenance'
  | 'purchase'
  | 'general'
  | 'other'

export interface ElectricityLog {
  id:               string
  room_id:          string
  month:            number
  year:             number
  prev_kwh:         number
  curr_kwh:         number
  /** Generated column: curr_kwh - prev_kwh */
  kwh_usage:        number
  prev_water_m3:    number | null
  curr_water_m3:    number | null
  /** Generated column: curr_water_m3 - prev_water_m3 */
  water_usage_m3:   number | null
  recorded_at:      string
  updated_at:       string
  recorded_by:      string | null
  room?:            Pick<Room, 'id' | 'name'>
}

export interface InvoiceExtraItem {
  label:  string
  amount: number
}

export interface Invoice {
  id:                  string
  room_id:             string
  month:               number
  year:                number
  rent_amount:         number
  electricity_amount:  number
  electricity_log_id:  string | null
  water_billing_mode:  WaterBillingMode
  water_amount:        number
  trash_fee:           number
  parking_fee:         number
  internet_fee:        number
  over_capacity_fee:   number
  extra_items:         InvoiceExtraItem[]
  total:               number
  paid_amount:         number
  status:              InvoiceStatus
  due_date:            string
  paid_at:             string | null
  note:                string | null
  created_by:          string | null
  created_at:          string
  updated_at:          string
  room?:               Pick<Room, 'id' | 'name' | 'floor'>
  electricity_log?:    ElectricityLog | null
}

export interface PaymentProof {
  id:               string
  invoice_id:       string
  tenant_id:        string
  amount_reported:  number
  proof_images:     string[]
  note:             string | null
  status:           PaymentProofStatus
  reviewed_by:      string | null
  reviewed_at:      string | null
  amount_approved:  number | null
  rejection_note:   string | null
  created_at:       string
  invoice?:         Pick<Invoice, 'id' | 'month' | 'year' | 'total' | 'paid_amount'> & {
    room?: Pick<Room, 'id' | 'name'>
  }
  tenant?:          Pick<User, 'id' | 'full_name' | 'phone'>
}

export interface Expense {
  id:              string
  /** null = chi phí toàn nhà */
  room_id:         string | null
  expense_type:    ExpenseType
  amount:          number
  description:     string
  expense_date:    string
  receipt_images:  string[]
  created_by:      string | null
  created_at:      string
  room?:           Pick<Room, 'id' | 'name'> | null
}

export interface MeterReadingLog {
  id:                  string
  electricity_log_id:  string
  field_changed:       'prev_kwh' | 'curr_kwh' | 'prev_water_m3' | 'curr_water_m3'
  old_value:           number | null
  new_value:           number | null
  reason:              string | null
  changed_by:          string | null
  changed_at:          string
}

export interface AppSetting<T = unknown> {
  key:         string
  value:       T
  description: string | null
}

// ─── Multi-tenant (T-016 — UC-02) ─────────────────────────
export type {
  RoomTenant,
  RoomTenantWithDetails,
  RoomTenantEntry,
  RoomWithTenants,
} from './room-tenant'
