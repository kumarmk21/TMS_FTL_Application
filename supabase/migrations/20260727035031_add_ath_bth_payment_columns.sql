-- Add separate columns for ATH and BTH Zoho payment IDs so they don't overwrite the bill ID
ALTER TABLE thc_details
  ADD COLUMN IF NOT EXISTS zoho_ath_payment_id text,
  ADD COLUMN IF NOT EXISTS zoho_ath_sync_status text DEFAULT 'not_synced',
  ADD COLUMN IF NOT EXISTS zoho_bth_payment_id text,
  ADD COLUMN IF NOT EXISTS zoho_bth_sync_status text DEFAULT 'not_synced';
