/*
  # Add Truck Dispatch Fields

  1. Changes
    - Add `thc_date` field to `booking_lr` table to store THC date
    - Add `thc_gross_amount` field to `thc_details` table for total amount before deductions
    - Add `thc_id_number` field to `thc_details` table for custom THC ID (VH000001 format)
    - Create sequence for THC ID generation

  2. Purpose
    - Support truck dispatch THC generation workflow
    - Track THC date on LR records
    - Calculate and store gross amounts before deductions
    - Generate sequential custom THC IDs

  3. Notes
    - thc_date will be populated when THC is generated
    - thc_gross_amount is calculated as: thc_amount + thc_loading_charges + thc_detention_charges
    - thc_id_number follows format VH000001, VH000002, etc.
*/

-- Add thc_date field to booking_lr table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_lr' AND column_name = 'thc_date'
  ) THEN
    ALTER TABLE booking_lr ADD COLUMN thc_date date;
  END IF;
END $$;

-- Add thc_gross_amount field to thc_details table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thc_details' AND column_name = 'thc_gross_amount'
  ) THEN
    ALTER TABLE thc_details ADD COLUMN thc_gross_amount numeric(15,2) DEFAULT 0;
  END IF;
END $$;

-- Add thc_id_number field to thc_details table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thc_details' AND column_name = 'thc_id_number'
  ) THEN
    ALTER TABLE thc_details ADD COLUMN thc_id_number text UNIQUE;
  END IF;
END $$;

-- Create sequence for THC ID generation
CREATE SEQUENCE IF NOT EXISTS thc_id_seq START WITH 1;

-- Create function to generate THC ID
CREATE OR REPLACE FUNCTION generate_thc_id()
RETURNS text AS $$
DECLARE
  next_id integer;
  thc_id_str text;
BEGIN
  next_id := nextval('thc_id_seq');
  thc_id_str := 'VH' || LPAD(next_id::text, 6, '0');
  RETURN thc_id_str;
END;
$$ LANGUAGE plpgsql;

-- Create index on thc_id_number for quick lookups
CREATE INDEX IF NOT EXISTS idx_thc_details_thc_id_number ON thc_details(thc_id_number);
