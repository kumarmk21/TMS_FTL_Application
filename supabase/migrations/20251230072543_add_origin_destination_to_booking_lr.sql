/*
  # Add Origin and Destination to Booking LR Table

  1. Changes
    - Add `origin_id` (uuid) as foreign key to city_master table
    - Add `destination_id` (uuid) as foreign key to city_master table
    - These fields provide structured references to cities for origin and destination
    - Allows proper filtering and reporting based on city relationships

  2. Notes
    - These fields are nullable to maintain backward compatibility
    - The existing `from_city` and `to_city` text fields remain for now
    - When an enquiry is selected, origin and destination are auto-populated from enquiry data
    - When no enquiry is selected, users can select from City Master dropdown
*/

-- Add origin_id and destination_id columns to booking_lr table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_lr' AND column_name = 'origin_id'
  ) THEN
    ALTER TABLE booking_lr ADD COLUMN origin_id uuid REFERENCES city_master(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_lr' AND column_name = 'destination_id'
  ) THEN
    ALTER TABLE booking_lr ADD COLUMN destination_id uuid REFERENCES city_master(id);
  END IF;
END $$;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_booking_lr_origin_id ON booking_lr(origin_id);
CREATE INDEX IF NOT EXISTS idx_booking_lr_destination_id ON booking_lr(destination_id);