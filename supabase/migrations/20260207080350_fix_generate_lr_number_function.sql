/*
  # Fix LR Number Generation Function
  
  1. Changes
    - Replace the incorrect generate_lr_number() function with the correct version
    - Function now properly uses financial year format (LR2526-000001)
    - Uses sequence for proper sequential numbering
  
  2. Security
    - No changes to RLS policies
*/

-- Drop and recreate the sequence
DROP SEQUENCE IF EXISTS lr_number_seq CASCADE;
CREATE SEQUENCE lr_number_seq START WITH 1;

-- Recreate the correct generate_lr_number function
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
  
  -- Format: LR + FinYear + 6-digit sequence (e.g., LR2526-000001)
  lr_number := 'LR' || financial_year || '-' || LPAD(next_seq::text, 6, '0');
  
  RETURN lr_number;
END;
$$;
