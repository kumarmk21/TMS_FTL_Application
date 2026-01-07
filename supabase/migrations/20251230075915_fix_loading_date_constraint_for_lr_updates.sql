/*
  # Fix Loading Date Constraint for LR Updates

  1. Changes
    - Drop the existing `loading_date_not_past` constraint
    - Replace with a trigger-based validation that only checks on INSERT
    - Allow UPDATE operations even when loading_date is in the past
  
  2. Reason
    - When an LR is created from an enquiry, we need to update the enquiry record with the LR number
    - The existing constraint prevents updating past enquiries even when just setting the lr_number
    - This fix allows updates to proceed while still preventing new enquiries with past dates
*/

-- Drop the existing constraint
ALTER TABLE order_enquiry 
DROP CONSTRAINT IF EXISTS loading_date_not_past;

-- Create a function to validate loading date only on INSERT
CREATE OR REPLACE FUNCTION check_loading_date_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.loading_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Loading date cannot be in the past';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that runs before INSERT
DROP TRIGGER IF EXISTS validate_loading_date_insert ON order_enquiry;

CREATE TRIGGER validate_loading_date_insert
  BEFORE INSERT ON order_enquiry
  FOR EACH ROW
  EXECUTE FUNCTION check_loading_date_on_insert();
