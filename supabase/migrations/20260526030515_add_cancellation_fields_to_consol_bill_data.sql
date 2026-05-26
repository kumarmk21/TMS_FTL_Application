/*
  # Add cancellation fields to consol_bill_data

  Adds three nullable columns to support bill cancellation:
  - `cancelled_at`        (timestamptz) — when the bill was cancelled
  - `cancelled_by`        (uuid)        — user ID of who cancelled it (FK to profiles)
  - `cancellation_reason` (text)        — optional reason entered by the user

  Existing `consol_bill_status` (text) will be set to 'Cancelled' on cancellation.
  All original bill data is preserved; no rows are deleted.

  Security: No RLS changes required — existing policies on consol_bill_data cover updates.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consol_bill_data' AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE consol_bill_data ADD COLUMN cancelled_at timestamptz DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consol_bill_data' AND column_name = 'cancelled_by'
  ) THEN
    ALTER TABLE consol_bill_data ADD COLUMN cancelled_by uuid DEFAULT NULL REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consol_bill_data' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE consol_bill_data ADD COLUMN cancellation_reason text DEFAULT NULL;
  END IF;
END $$;
