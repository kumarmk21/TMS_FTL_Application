/*
  # Add Bill Due Date to Booking LR Table

  1. Changes
    - Add `bill_due_date` (date) - Bill due date calculated as bill_date + credit_days

  2. Notes
    - Bill due date is populated when bill is generated
    - Used for tracking payment due dates
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_lr' AND column_name = 'bill_due_date'
  ) THEN
    ALTER TABLE booking_lr ADD COLUMN bill_due_date date;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_booking_lr_bill_due_date ON booking_lr(bill_due_date);