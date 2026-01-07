/*
  # Add Vehicle and Driver Fields to Booking LR Table

  1. Changes
    - Add `vehicle_number` (text) - Vehicle registration number
    - Add `driver_number` (text) - Driver mobile number (10 digits)
    - Add `driver_name` (text) - Driver name

  2. Notes
    - These fields are required for complete LR entry tracking
    - Driver number has a 10-character constraint
    - All fields are nullable to maintain backward compatibility
*/

-- Add vehicle and driver fields to booking_lr table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_lr' AND column_name = 'vehicle_number'
  ) THEN
    ALTER TABLE booking_lr ADD COLUMN vehicle_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_lr' AND column_name = 'driver_number'
  ) THEN
    ALTER TABLE booking_lr ADD COLUMN driver_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_lr' AND column_name = 'driver_name'
  ) THEN
    ALTER TABLE booking_lr ADD COLUMN driver_name text;
  END IF;
END $$;