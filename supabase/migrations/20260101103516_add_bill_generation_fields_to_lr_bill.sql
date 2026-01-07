/*
  # Add Bill Generation Fields to LR Bill Table

  1. Changes
    - Add `bill_generation_branch` (uuid, foreign key) - Branch from where bill is generated, references company_master
    - Add `billing_party_code` (text) - Billing party code from customer_master
    - Add `billing_party_name` (text) - Billing party name
    - Add `bill_to_state` (text) - State from customer_gst_master
    - Add `bill_to_gstin` (text) - GSTIN from customer_gst_master
    - Add `bill_to_address` (text) - Complete address from customer_gst_master
    - Add `credit_days` (integer) - Credit days from customer_master
    - Add `sub_total` (numeric) - Sum of freight amounts
    - Add `bill_amount` (numeric) - Total bill amount including taxes
    - Rename lr_bill_number to bill_number for consistency
    - Rename lr_bill_date to bill_date for consistency
    - Rename lr_bill_due_date to bill_due_date for consistency

  2. Notes
    - Bill generation branch links to company_master for branch details
    - Bill number follows format starting from 29100001
    - Bill due date calculated as bill_date + credit_days
    - Sub total is sum of freight_amount from all LRs in the bill
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lr_bill' AND column_name = 'bill_generation_branch'
  ) THEN
    ALTER TABLE lr_bill ADD COLUMN bill_generation_branch uuid REFERENCES company_master(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lr_bill' AND column_name = 'billing_party_code'
  ) THEN
    ALTER TABLE lr_bill ADD COLUMN billing_party_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lr_bill' AND column_name = 'billing_party_name'
  ) THEN
    ALTER TABLE lr_bill ADD COLUMN billing_party_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lr_bill' AND column_name = 'bill_to_state'
  ) THEN
    ALTER TABLE lr_bill ADD COLUMN bill_to_state text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lr_bill' AND column_name = 'bill_to_gstin'
  ) THEN
    ALTER TABLE lr_bill ADD COLUMN bill_to_gstin text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lr_bill' AND column_name = 'bill_to_address'
  ) THEN
    ALTER TABLE lr_bill ADD COLUMN bill_to_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lr_bill' AND column_name = 'credit_days'
  ) THEN
    ALTER TABLE lr_bill ADD COLUMN credit_days integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lr_bill' AND column_name = 'sub_total'
  ) THEN
    ALTER TABLE lr_bill ADD COLUMN sub_total numeric(15,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lr_bill' AND column_name = 'bill_amount'
  ) THEN
    ALTER TABLE lr_bill ADD COLUMN bill_amount numeric(15,2) DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lr_bill_billing_party ON lr_bill(billing_party_code);
CREATE INDEX IF NOT EXISTS idx_lr_bill_generation_branch ON lr_bill(bill_generation_branch);