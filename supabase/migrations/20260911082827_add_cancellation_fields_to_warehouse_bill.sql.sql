-- Add cancellation tracking columns to warehouse_bill table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warehouse_bill' AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE warehouse_bill ADD COLUMN cancelled_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warehouse_bill' AND column_name = 'cancelled_by'
  ) THEN
    ALTER TABLE warehouse_bill ADD COLUMN cancelled_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warehouse_bill' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE warehouse_bill ADD COLUMN cancellation_reason text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_warehouse_bill_cancelled_at ON warehouse_bill(cancelled_at) WHERE cancelled_at IS NOT NULL;
