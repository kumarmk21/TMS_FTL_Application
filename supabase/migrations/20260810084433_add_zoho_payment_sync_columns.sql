/*
# Add Zoho Payment Sync Columns and Sync Log Table

## Purpose
Enables one-way sync of customer payment data from Zoho Books to TMS.
Payments recorded in Zoho Books will be pulled into the TMS payment_receipts table
and displayed in the Bill Collection module.

## Changes to payment_receipts table
- zoho_payment_id (text) — Zoho's internal payment ID, used for deduplication
- zoho_payment_number (text) — Zoho payment receipt number shown to users
- zoho_invoice_id (text) — Zoho invoice ID this payment was applied to
- zoho_invoice_number (text) — Zoho invoice number for display
- zoho_bank_account_id (text) — Zoho bank/cash account ID the payment was deposited to
- zoho_bank_account_name (text) — Zoho bank/cash account name for display
- zoho_synced_at (timestamptz) — when this receipt was last synced from Zoho
- sync_source (text, default 'manual') — 'zoho' for Zoho-imported, 'manual' for TMS-created
- sync_status (text, default 'synced') — 'synced', 'updated_in_zoho', 'deleted_in_zoho'

## New table: zoho_payment_sync_log
Tracks each sync run for audit and reconciliation:
- log_id (uuid PK)
- sync_date (timestamptz) — when the sync ran
- total_zoho_payments (int) — payments found in Zoho
- total_imported (int) — new receipts created in TMS
- total_updated (int) — existing receipts updated
- total_skipped (int) — payments skipped (already matched, unmatched bill, etc.)
- total_errors (int) — errors encountered
- details (jsonb) — per-payment details for the reconciliation report
- synced_by (uuid) — user who triggered the sync

## Security
- RLS enabled on zoho_payment_sync_log
- Policies for authenticated users to read and insert (admin tool)
*/

-- Add Zoho columns to payment_receipts
DO $$ BEGIN
  ALTER TABLE payment_receipts ADD COLUMN IF NOT EXISTS zoho_payment_id text;
  ALTER TABLE payment_receipts ADD COLUMN IF NOT EXISTS zoho_payment_number text;
  ALTER TABLE payment_receipts ADD COLUMN IF NOT EXISTS zoho_invoice_id text;
  ALTER TABLE payment_receipts ADD COLUMN IF NOT EXISTS zoho_invoice_number text;
  ALTER TABLE payment_receipts ADD COLUMN IF NOT EXISTS zoho_bank_account_id text;
  ALTER TABLE payment_receipts ADD COLUMN IF NOT EXISTS zoho_bank_account_name text;
  ALTER TABLE payment_receipts ADD COLUMN IF NOT EXISTS zoho_synced_at timestamptz;
  ALTER TABLE payment_receipts ADD COLUMN IF NOT EXISTS sync_source text DEFAULT 'manual';
  ALTER TABLE payment_receipts ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'synced';
END $$;

-- Create index on zoho_payment_id for deduplication lookups
CREATE INDEX IF NOT EXISTS idx_payment_receipts_zoho_payment_id ON payment_receipts(zoho_payment_id) WHERE zoho_payment_id IS NOT NULL;

-- Create sync log table
CREATE TABLE IF NOT EXISTS zoho_payment_sync_log (
  log_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_date timestamptz NOT NULL DEFAULT now(),
  total_zoho_payments int DEFAULT 0,
  total_imported int DEFAULT 0,
  total_updated int DEFAULT 0,
  total_skipped int DEFAULT 0,
  total_errors int DEFAULT 0,
  details jsonb DEFAULT '[]'::jsonb,
  synced_by uuid
);

ALTER TABLE zoho_payment_sync_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_sync_log" ON zoho_payment_sync_log;
CREATE POLICY "select_sync_log" ON zoho_payment_sync_log FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_sync_log" ON zoho_payment_sync_log;
CREATE POLICY "insert_sync_log" ON zoho_payment_sync_log FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_sync_log" ON zoho_payment_sync_log;
CREATE POLICY "update_sync_log" ON zoho_payment_sync_log FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
