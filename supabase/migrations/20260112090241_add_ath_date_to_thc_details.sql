/*
  # Add ATH Date to THC Details

  1. Changes
    - Add `ath_date` column to `thc_details` table
      - Type: date (to store the ATH date)
      - Nullable: true (existing records won't have this)
  
  2. Notes
    - This field will store the date when the advance is processed/uploaded
    - Will be set when generating the bank file
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thc_details' AND column_name = 'ath_date'
  ) THEN
    ALTER TABLE thc_details ADD COLUMN ath_date date;
  END IF;
END $$;
