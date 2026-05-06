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

export interface Room {
  id: string
  name: string
  floor: number
  price: number
  status: 'vacant' | 'occupied' | 'maintenance'
  tenant_id: string | null
  tenant?: User | null
}

export type NotificationType =
  | 'payment_reminder'
  | 'payment_confirmed'
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

export interface AuthPayload {
  userId: string
  phone: string
  role: UserRole
  fullName: string
}
