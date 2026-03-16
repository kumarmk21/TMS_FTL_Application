/*
  # Add consol bill amount columns to booking_lr

  ## Changes
  - Adds `consol_bill_amount` (numeric) to booking_lr
  - Adds `consol_bill_pending_amount` (numeric) to booking_lr

  These columns are written when a Consolidate Bill is generated and were
  missing, causing the "Error generating consolidation bill" failure.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_lr' AND column_name = 'consol_bill_amount'
  ) THEN
    ALTER TABLE booking_lr ADD COLUMN consol_bill_amount numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_lr' AND column_name = 'consol_bill_pending_amount'
  ) THEN
    ALTER TABLE booking_lr ADD COLUMN consol_bill_pending_amount numeric DEFAULT 0;
  END IF;
END $$;
