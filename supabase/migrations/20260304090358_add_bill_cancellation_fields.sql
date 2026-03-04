/*
  # Add Bill Cancellation and Regeneration Support

  1. Changes to lr_bill table
    - Add `bill_status` column (Active, Cancelled, Regenerated)
    - Add `cancelled_at` timestamp column
    - Add `cancelled_by` user reference column
    - Add `cancellation_reason` text column
    - Add `original_bill_id` to track regenerated bills

  2. Security
    - No RLS changes needed (inherits existing policies)

  ## Notes
  - Supports bill cancellation workflow
  - Tracks who cancelled and when
  - Links regenerated bills to original bills
  - Maintains audit trail
*/

-- Add cancellation tracking columns to lr_bill table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lr_bill' AND column_name = 'bill_status'
  ) THEN
    ALTER TABLE lr_bill ADD COLUMN bill_status text DEFAULT 'Active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lr_bill' AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE lr_bill ADD COLUMN cancelled_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lr_bill' AND column_name = 'cancelled_by'
  ) THEN
    ALTER TABLE lr_bill ADD COLUMN cancelled_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lr_bill' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE lr_bill ADD COLUMN cancellation_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lr_bill' AND column_name = 'original_bill_id'
  ) THEN
    ALTER TABLE lr_bill ADD COLUMN original_bill_id uuid REFERENCES lr_bill(bill_id);
  END IF;
END $$;

-- Create index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_lr_bill_status ON lr_bill(bill_status) WHERE bill_status IS NOT NULL;

-- Create index for cancelled bills
CREATE INDEX IF NOT EXISTS idx_lr_bill_cancelled_at ON lr_bill(cancelled_at) WHERE cancelled_at IS NOT NULL;
