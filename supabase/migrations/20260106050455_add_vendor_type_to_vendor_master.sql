/*
  # Add Vendor Type to Vendor Master

  1. Changes
    - Add `vendor_type` column to `vendor_master` table
    - Set as mandatory field with check constraint
    - Only allows 'Transporter' or 'Admin' values
    - Set default value to 'Transporter'

  2. Notes
    - Existing vendors will be set to 'Transporter' by default
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_master' AND column_name = 'vendor_type'
  ) THEN
    ALTER TABLE vendor_master 
    ADD COLUMN vendor_type text NOT NULL DEFAULT 'Transporter'
    CHECK (vendor_type IN ('Transporter', 'Admin'));
  END IF;
END $$;
