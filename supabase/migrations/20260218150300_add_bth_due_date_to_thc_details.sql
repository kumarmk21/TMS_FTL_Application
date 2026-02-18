/*
  # Add BTH Due Date to THC Details
  
  1. Changes
    - Add `bth_due_date` column to `thc_details` table
    - This field stores the balance payment due date calculated as POD received date + 45 days
  
  2. Notes
    - Field is nullable as it will only be populated when POD is received
    - Data type is DATE to match other date fields in the table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thc_details' AND column_name = 'bth_due_date'
  ) THEN
    ALTER TABLE thc_details ADD COLUMN bth_due_date date;
  END IF;
END $$;
