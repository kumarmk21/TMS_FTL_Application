/*
  # Add Current Location to THC Details

  1. Changes
    - Add `current_location` column to `thc_details` table to store the latest geo location from FreightTiger API
    - Column stores location as text format
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thc_details' AND column_name = 'current_location'
  ) THEN
    ALTER TABLE thc_details ADD COLUMN current_location text;
  END IF;
END $$;
