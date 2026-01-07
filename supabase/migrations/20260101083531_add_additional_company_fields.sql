/*
  # Add Additional Fields to Company Master

  1. Changes
    - Add `msme_no` (text, optional) - MSME registration number
    - Add `pan` (text, mandatory) - PAN number (10 characters)
    - Add `bank_name` (text, mandatory) - Bank name
    - Add `account_number` (text, mandatory) - Bank account number
    - Add `ifsc_code` (text, mandatory) - IFSC code (11 characters)
    - Add `bank_branch` (text, mandatory) - Bank branch name
    - Add `bill_footer1` (text, optional) - Bill footer line 1
    - Add `bill_footer2` (text, optional) - Bill footer line 2
    - Add `bill_footer3` (text, optional) - Bill footer line 3
    - Add `bill_footer4` (text, optional) - Bill footer line 4

  2. Notes
    - Using DO block to safely add columns if they don't exist
    - PAN is 10 characters, IFSC is 11 characters
    - Banking fields are mandatory for financial transactions
    - Bill footer fields are optional for customization
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_master' AND column_name = 'msme_no'
  ) THEN
    ALTER TABLE company_master ADD COLUMN msme_no text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_master' AND column_name = 'pan'
  ) THEN
    ALTER TABLE company_master ADD COLUMN pan text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_master' AND column_name = 'bank_name'
  ) THEN
    ALTER TABLE company_master ADD COLUMN bank_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_master' AND column_name = 'account_number'
  ) THEN
    ALTER TABLE company_master ADD COLUMN account_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_master' AND column_name = 'ifsc_code'
  ) THEN
    ALTER TABLE company_master ADD COLUMN ifsc_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_master' AND column_name = 'bank_branch'
  ) THEN
    ALTER TABLE company_master ADD COLUMN bank_branch text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_master' AND column_name = 'bill_footer1'
  ) THEN
    ALTER TABLE company_master ADD COLUMN bill_footer1 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_master' AND column_name = 'bill_footer2'
  ) THEN
    ALTER TABLE company_master ADD COLUMN bill_footer2 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_master' AND column_name = 'bill_footer3'
  ) THEN
    ALTER TABLE company_master ADD COLUMN bill_footer3 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_master' AND column_name = 'bill_footer4'
  ) THEN
    ALTER TABLE company_master ADD COLUMN bill_footer4 text;
  END IF;
END $$;