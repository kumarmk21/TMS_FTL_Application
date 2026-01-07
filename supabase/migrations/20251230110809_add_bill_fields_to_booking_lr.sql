/*
  # Add Bill Fields to Booking LR Table

  1. Changes
    - Add `bill_no` (text) - Customer bill number
    - Add `bill_date` (date) - Date when bill was generated
    - Add `bill_amount` (numeric) - Total bill amount
    - Add index on bill_no for quick lookups
    - Add index on bill_date for date-based queries

  2. Notes
    - LRs with null bill_no are considered unbilled
    - LRs with bill_no are considered billed and won't appear in bill generation
    - bill_amount represents the final billed amount for this LR
*/

-- Add bill-related columns to booking_lr table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_lr' AND column_name = 'bill_no'
  ) THEN
    ALTER TABLE booking_lr ADD COLUMN bill_no text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_lr' AND column_name = 'bill_date'
  ) THEN
    ALTER TABLE booking_lr ADD COLUMN bill_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_lr' AND column_name = 'bill_amount'
  ) THEN
    ALTER TABLE booking_lr ADD COLUMN bill_amount numeric(15,2);
  END IF;
END $$;

-- Create indexes for bill-related queries
CREATE INDEX IF NOT EXISTS idx_booking_lr_bill_no ON booking_lr(bill_no);
CREATE INDEX IF NOT EXISTS idx_booking_lr_bill_date ON booking_lr(bill_date);
CREATE INDEX IF NOT EXISTS idx_booking_lr_billing_party ON booking_lr(billing_party_code);