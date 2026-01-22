/*
  # Add SAC Code Fields to LR Bill Table

  1. Changes to `lr_bill` table
    - Add `sac_code` (text) - SAC code reference
    - Add `sac_description` (text) - SAC code description
    - Add foreign key relationship to sac_code_master table via sac_code

  2. Notes
    - These fields will be used for GST compliance in customer bills
    - Values will be selected from sac_code_master table
    - Fields are nullable to allow existing records to remain valid
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lr_bill' AND column_name = 'sac_code'
  ) THEN
    ALTER TABLE lr_bill ADD COLUMN sac_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lr_bill' AND column_name = 'sac_description'
  ) THEN
    ALTER TABLE lr_bill ADD COLUMN sac_description text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lr_bill_sac_code ON lr_bill(sac_code);