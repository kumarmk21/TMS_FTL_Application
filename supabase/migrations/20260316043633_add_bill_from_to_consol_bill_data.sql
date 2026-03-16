/*
  # Add bill_from_company to consol_bill_data

  1. Changes
    - `consol_bill_data` table: add `bill_from_company` column (text) to store the company_code of the billing company
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consol_bill_data' AND column_name = 'bill_from_company'
  ) THEN
    ALTER TABLE consol_bill_data ADD COLUMN bill_from_company text REFERENCES company_master(company_code);
  END IF;
END $$;
