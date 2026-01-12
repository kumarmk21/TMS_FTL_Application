/*
  # Add ATH Voucher Number to THC Details

  1. Changes
    - Add `ath_voucher_no` column to `thc_details` table
      - Text field to store auto-generated voucher numbers with "ADV" prefix
      - Used during Finance -> Truck Advance Payment operations
      - Format: ADV0000001, ADV0000002, etc.
    
  2. Function
    - Create function to auto-generate voucher numbers with "ADV" prefix
    - Sequence starts at ADV0000001 and increments
    
  3. Notes
    - Field is nullable initially (filled when advance payment is made)
    - Can be manually edited if needed by Finance team
*/

-- Add the ATH Voucher Number column to thc_details
ALTER TABLE thc_details
ADD COLUMN IF NOT EXISTS ath_voucher_no text;

-- Create a function to generate the next ATH voucher number
CREATE OR REPLACE FUNCTION generate_ath_voucher_no()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_number integer;
  voucher_no text;
BEGIN
  -- Get the highest existing voucher number
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(ath_voucher_no FROM 4) AS integer
      )
    ),
    0
  ) INTO next_number
  FROM thc_details
  WHERE ath_voucher_no IS NOT NULL 
    AND ath_voucher_no ~ '^ADV[0-9]+$';
  
  -- Increment and format with leading zeros (7 digits total)
  next_number := next_number + 1;
  voucher_no := 'ADV' || LPAD(next_number::text, 7, '0');
  
  RETURN voucher_no;
END;
$$;

-- Add comment to document the field
COMMENT ON COLUMN thc_details.ath_voucher_no IS 'Auto-generated voucher number for truck advance payment (ATH). Format: ADV0000001. Generated during Finance -> Truck Advance Payment operation.';