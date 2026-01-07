/*
  # Add LR Number Type and Auto-Generation

  1. Changes
    - Add `lr_no_type` enum field to booking_lr table
    - Modify `manual_lr_no` to support both types
    - Create sequence for system-generated LR numbers
    - Add function to auto-generate LR numbers with format: LR + financial year + sequential number (e.g., LR2425-000001)
    - Add trigger to auto-populate system-generated LR numbers before insert

  2. Security
    - No changes to existing RLS policies
*/

-- Create enum type for LR number type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lr_number_type') THEN
    CREATE TYPE lr_number_type AS ENUM ('system_generated', 'pre_printed');
  END IF;
END $$;

-- Add lr_no_type column to booking_lr table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_lr' AND column_name = 'lr_no_type'
  ) THEN
    ALTER TABLE booking_lr 
    ADD COLUMN lr_no_type lr_number_type NOT NULL DEFAULT 'system_generated';
  END IF;
END $$;

-- Create sequence for LR numbers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'lr_number_seq') THEN
    CREATE SEQUENCE lr_number_seq START WITH 1;
  END IF;
END $$;

-- Function to generate LR number based on financial year
CREATE OR REPLACE FUNCTION generate_lr_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  current_month int;
  financial_year text;
  next_seq int;
  lr_number text;
BEGIN
  -- Get current month
  current_month := EXTRACT(MONTH FROM CURRENT_DATE);
  
  -- Determine financial year (April to March)
  IF current_month >= 4 THEN
    financial_year := SUBSTRING(EXTRACT(YEAR FROM CURRENT_DATE)::text FROM 3 FOR 2) || 
                     SUBSTRING(EXTRACT(YEAR FROM CURRENT_DATE + INTERVAL '1 year')::text FROM 3 FOR 2);
  ELSE
    financial_year := SUBSTRING(EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 year')::text FROM 3 FOR 2) || 
                     SUBSTRING(EXTRACT(YEAR FROM CURRENT_DATE)::text FROM 3 FOR 2);
  END IF;
  
  -- Get next sequence number
  next_seq := nextval('lr_number_seq');
  
  -- Format: LR + FinYear + 6-digit sequence (e.g., LR2425-000001)
  lr_number := 'LR' || financial_year || '-' || LPAD(next_seq::text, 6, '0');
  
  RETURN lr_number;
END;
$$;

-- Function to auto-populate LR number before insert
CREATE OR REPLACE FUNCTION auto_populate_lr_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only generate if lr_no_type is system_generated and manual_lr_no is null or empty
  IF NEW.lr_no_type = 'system_generated' AND (NEW.manual_lr_no IS NULL OR NEW.manual_lr_no = '') THEN
    NEW.manual_lr_no := generate_lr_number();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_populate_lr_number ON booking_lr;
CREATE TRIGGER trigger_auto_populate_lr_number
  BEFORE INSERT ON booking_lr
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_lr_number();
