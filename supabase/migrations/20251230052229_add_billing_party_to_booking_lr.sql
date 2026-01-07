/*
  # Add Billing Party to Booking LR Table

  1. Changes
    - Add `billing_party_id` column to `booking_lr` table (references customer_master)
    - Add `billing_party_name` column to `booking_lr` table

  2. Notes
    - Billing party can be different from consignor or consignee
    - Tracks who is responsible for payment
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_lr' AND column_name = 'billing_party_id'
  ) THEN
    ALTER TABLE booking_lr ADD COLUMN billing_party_id uuid REFERENCES customer_master(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_lr' AND column_name = 'billing_party_name'
  ) THEN
    ALTER TABLE booking_lr ADD COLUMN billing_party_name text DEFAULT '';
  END IF;
END $$;
