/*
  # Add unloading_date to thc_details table

  1. Changes
    - Add `unloading_date` column to `thc_details` table
      - Type: date
      - Description: Stores the date when the truck was unloaded at destination
      - This will be updated when truck arrival is recorded

  2. Notes
    - This field will be synchronized with `act_del_date` in booking_lr table
    - Used to track actual unloading date for THC calculations
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thc_details' AND column_name = 'unloading_date'
  ) THEN
    ALTER TABLE thc_details ADD COLUMN unloading_date date;
  END IF;
END $$;
