/*
  # Fix Auto-populate LR Number Trigger Function
  
  1. Changes
    - Fix auto_populate_lr_number() to populate manual_lr_no instead of tran_id
    - Check lr_no_type field and only generate for 'system_generated' type
    - Only generate when manual_lr_no is null or empty string
  
  2. Security
    - No changes to RLS policies
*/

-- Recreate the correct auto_populate_lr_number function
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
