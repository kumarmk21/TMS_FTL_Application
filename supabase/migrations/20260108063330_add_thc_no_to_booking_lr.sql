/*
  # Add THC Number to Booking LR Table

  1. Changes
    - Add `thc_no` field to `booking_lr` table
      - `thc_no` (text) - Truck Hire Challan Number
    
  2. Purpose
    - Store THC number reference in booking LR records
    - This field will be populated when Truck Dispatch form is saved
    - Enables linking between LR entries and THC details
  
  3. Notes
    - Field is optional and will be populated during truck dispatch process
    - Multiple LRs may reference the same THC number if they are on the same truck
*/

-- Add thc_no field to booking_lr table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_lr' AND column_name = 'thc_no'
  ) THEN
    ALTER TABLE booking_lr ADD COLUMN thc_no text;
  END IF;
END $$;

-- Create index on thc_no for quick lookups
CREATE INDEX IF NOT EXISTS idx_booking_lr_thc_no ON booking_lr(thc_no);