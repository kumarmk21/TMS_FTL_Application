/*
  # Update Warehouse Bill Number Format
  
  1. Changes
    - Update bill number format from WB29100001 to HQWH0000036
    - Starting number: HQWH0000036 (next bill will be #36)
  
  2. Details
    - Modified generate_warehouse_bill_number() function
    - New format: HQWH followed by 7-digit zero-padded number
    - Starting sequence at 35 so next generated bill is HQWH0000036
*/

-- Drop and recreate the warehouse bill number generation function with new format
CREATE OR REPLACE FUNCTION generate_warehouse_bill_number()
RETURNS text AS $$
DECLARE
  next_number integer;
  new_bill_number text;
BEGIN
  -- Extract numeric part after HQWH prefix and get the max, default to 35 so next is 36
  SELECT COALESCE(MAX(CAST(SUBSTRING(bill_number FROM 5) AS integer)), 35) + 1
  INTO next_number
  FROM warehouse_bill
  WHERE bill_number ~ '^HQWH[0-9]+$';
  
  -- Format: HQWH + 7-digit zero-padded number (e.g., HQWH0000036)
  new_bill_number := 'HQWH' || LPAD(next_number::text, 7, '0');
  RETURN new_bill_number;
END;
$$ LANGUAGE plpgsql;