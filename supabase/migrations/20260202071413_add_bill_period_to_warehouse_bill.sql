/*
  # Add Bill Period to Warehouse Bill Table

  1. Changes
    - Add `bill_period` column to `warehouse_bill` table
      - Format: mmm-yyyy (e.g., Jan-2026, Feb-2026)
      - Text field to store the billing period
      - Optional field

  2. Notes
    - This field represents the billing period for warehouse services
    - Format is mmm-yyyy (like Jan-2026) for easy readability
*/

-- Add bill_period column to warehouse_bill table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warehouse_bill' AND column_name = 'bill_period'
  ) THEN
    ALTER TABLE warehouse_bill ADD COLUMN bill_period text;
  END IF;
END $$;
