/*
  # Add Company GST Change Columns to Audit Table

  1. Modified Tables
    - `bill_billing_party_changes`
      - `old_company_gst_number` (text, nullable) - Previous company GST number
      - `new_company_gst_number` (text, nullable) - New company GST number
      - `bill_type` (text, nullable, default 'LR') - Bill type: 'LR' or 'Warehouse'

  2. Security
    - No policy changes — existing SELECT and INSERT policies still apply.

  3. Notes
    - These columns allow tracking company GST number changes alongside
      billing party changes in the same audit table.
*/

ALTER TABLE bill_billing_party_changes
  ADD COLUMN IF NOT EXISTS old_company_gst_number text,
  ADD COLUMN IF NOT EXISTS new_company_gst_number text,
  ADD COLUMN IF NOT EXISTS bill_type text DEFAULT 'LR';
