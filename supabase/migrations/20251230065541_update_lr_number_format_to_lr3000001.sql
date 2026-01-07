/*
  # Update LR Number Format to LR3000001

  1. Changes
    - Update the sequence to start from 3000001
    - Modify the generate_lr_number() function to use format: LR3000001, LR3000002, etc.
    - Remove financial year from LR number format

  2. Notes
    - LR numbers will now be in format: LR3000001, LR3000002, LR3000003...
    - Sequence starts from 3000001
*/

-- Drop and recreate the sequence to start from 3000001
DROP SEQUENCE IF EXISTS lr_number_seq CASCADE;
CREATE SEQUENCE lr_number_seq START WITH 3000001;

-- Update the function to generate LR number in new format
CREATE OR REPLACE FUNCTION generate_lr_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_seq int;
  lr_number text;
BEGIN
  -- Get next sequence number
  next_seq := nextval('lr_number_seq');
  
  -- Format: LR + 7-digit sequence (e.g., LR3000001)
  lr_number := 'LR' || next_seq::text;
  
  RETURN lr_number;
END;
$$;