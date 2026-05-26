/*
  # Add division column to consol_bill_data

  1. Changes
    - `consol_bill_data`: add optional `division` (text) column
      - Stores a free-text division name entered by the user at bill generation time
      - Nullable — no division required for existing records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consol_bill_data' AND column_name = 'division'
  ) THEN
    ALTER TABLE consol_bill_data ADD COLUMN division text;
  END IF;
END $$;
