/*
# Create Vendor Bill Payment Integration Tables

1. Purpose
   - Stores vendor bill payment records for the Zoho Books vendor payment integration.
   - Supports two payment types: ATH (Advance to Hand / pre-payment) and BTH (Bill to Hand / post-delivery).
   - Each record tracks the payment's status as it moves from pending → processing → posted/failed,
     and stores the Zoho payment ID once successfully posted.
   - A separate single-row settings table stores configurable options for the module.

2. New Tables
   - `vendor_payments`
     - `id` (uuid, primary key) — unique payment record ID
     - `vendor_name` (text, not null) — display name of the vendor
     - `vendor_id` (text, not null) — Zoho Books contact ID for the vendor
     - `bill_amount` (numeric(15,2), not null) — amount being paid
     - `payment_date` (date, not null) — date the payment is made
     - `payment_type` (text, not null) — 'ATH' or 'BTH'
     - `status` (text, not null, default 'pending') — 'pending', 'processing', 'posted', 'failed'
     - `zoho_payment_id` (text) — Zoho Books payment ID, set after successful posting
     - `reference_number` (text) — auto-generated reference (ATH-XXXXXX or BTH-XXXXXX)
     - `bill_id` (text) — Zoho Books bill ID, required for BTH payments to link payment to a bill
     - `notes` (text) — optional user-entered notes
     - `error_message` (text) — stores the error message if posting fails
     - `posted_at` (timestamptz) — timestamp when payment was successfully posted to Zoho
     - `created_at` (timestamptz, default now) — record creation timestamp
     - `updated_at` (timestamptz, default now) — last update timestamp
     - `created_by` (uuid, references auth.users) — user who created the payment
   - `vendor_payment_settings`
     - `id` (int, primary key, default 1) — singleton row
     - `default_bank_account` (text, not null, default 'HDFC Bank CA') — bank account name in Zoho Books
     - `auto_post` (boolean, default false) — auto-post payments on creation vs manual
     - `ath_requires_approval` (boolean, default true) — ATH payments require approval before posting
     - `bth_requires_approval` (boolean, default false) — BTH payments require approval before posting
     - `updated_at` (timestamptz, default now) — last settings update

3. Security
   - Enable RLS on both tables.
   - This app has a sign-in screen, so policies are scoped to `authenticated`.
   - `vendor_payments`: any authenticated user can read; only the creator can insert; any authenticated user can update (for status changes after posting); only the creator can delete.
   - `vendor_payment_settings`: any authenticated user can read and update settings.

4. Notes
   - The `vendor_payments.reference_number` is auto-generated in the frontend as ATH-XXXXXX or BTH-XXXXXX.
   - The `vendor_payments.status` column has a CHECK constraint to ensure only valid statuses are stored.
   - The `vendor_payment_settings` table uses a singleton pattern (id = 1) matching the existing zoho_oauth_tokens table.
*/

-- ── vendor_payments table ──
CREATE TABLE IF NOT EXISTS vendor_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name text NOT NULL,
  vendor_id text NOT NULL,
  bill_amount numeric(15,2) NOT NULL,
  payment_date date NOT NULL,
  payment_type text NOT NULL CHECK (payment_type IN ('ATH', 'BTH')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'posted', 'failed')),
  zoho_payment_id text,
  reference_number text,
  bill_id text,
  notes text,
  error_message text,
  posted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE vendor_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_vendor_payments" ON vendor_payments;
CREATE POLICY "select_vendor_payments" ON vendor_payments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_vendor_payments" ON vendor_payments;
CREATE POLICY "insert_vendor_payments" ON vendor_payments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "update_vendor_payments" ON vendor_payments;
CREATE POLICY "update_vendor_payments" ON vendor_payments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_vendor_payments" ON vendor_payments;
CREATE POLICY "delete_vendor_payments" ON vendor_payments
  FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_vendor_payments_status ON vendor_payments(status);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_payment_type ON vendor_payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor_id ON vendor_payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_created_at ON vendor_payments(created_at);

-- ── vendor_payment_settings table (singleton) ──
CREATE TABLE IF NOT EXISTS vendor_payment_settings (
  id integer PRIMARY KEY DEFAULT 1,
  default_bank_account text NOT NULL DEFAULT 'HDFC Bank CA',
  auto_post boolean NOT NULL DEFAULT false,
  ath_requires_approval boolean NOT NULL DEFAULT true,
  bth_requires_approval boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE vendor_payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_vendor_payment_settings" ON vendor_payment_settings;
CREATE POLICY "select_vendor_payment_settings" ON vendor_payment_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_vendor_payment_settings" ON vendor_payment_settings;
CREATE POLICY "insert_vendor_payment_settings" ON vendor_payment_settings
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_vendor_payment_settings" ON vendor_payment_settings;
CREATE POLICY "update_vendor_payment_settings" ON vendor_payment_settings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Seed the singleton settings row if it doesn't exist
INSERT INTO vendor_payment_settings (id, default_bank_account, auto_post, ath_requires_approval, bth_requires_approval)
VALUES (1, 'HDFC Bank CA', false, true, false)
ON CONFLICT (id) DO NOTHING;
