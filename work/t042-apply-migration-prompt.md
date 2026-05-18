Migration v22 (T-042 contract renewal) — apply qua Claude-for-Google.

Mở Supabase Studio → SQL Editor → paste từng block [SQL-XXX-START/END]
(không bao gồm comment đầu/cuối) → Run.

[SQL-V22-1-START]
ALTER TABLE notifications ALTER COLUMN sender_id DROP NOT NULL;
[SQL-V22-1-END]

[SQL-V22-2-START]
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'payment_reminder',
  'payment_reported',
  'payment_confirmed',
  'payment_rejected',
  'extension_request',
  'extension_approved',
  'extension_rejected',
  'meter_reading_reminder',
  'contract_renewal_reminder'
));
[SQL-V22-2-END]

[SQL-V22-3-START]
ALTER TABLE room_tenants ADD COLUMN IF NOT EXISTS contract_end_date DATE;
[SQL-V22-3-END]

[SQL-V22-4-START]
CREATE INDEX IF NOT EXISTS idx_room_tenants_contract_end
  ON room_tenants(contract_end_date)
  WHERE left_at IS NULL AND contract_end_date IS NOT NULL;
[SQL-V22-4-END]

Verify sau apply:

[SQL-V22-VERIFY-1-START]
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name='notifications' AND column_name='sender_id';
[SQL-V22-VERIFY-1-END]
-- Expect: sender_id | YES

[SQL-V22-VERIFY-2-START]
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name='room_tenants' AND column_name='contract_end_date';
[SQL-V22-VERIFY-2-END]
-- Expect: contract_end_date | date

[SQL-V22-VERIFY-3-START]
SELECT consrc FROM pg_constraint WHERE conname='notifications_type_check';
[SQL-V22-VERIFY-3-END]
-- Expect: contains 'meter_reading_reminder' và 'contract_renewal_reminder'
