ALTER TABLE thc_details
  ADD COLUMN IF NOT EXISTS zoho_ath_error text,
  ADD COLUMN IF NOT EXISTS zoho_bth_error text;