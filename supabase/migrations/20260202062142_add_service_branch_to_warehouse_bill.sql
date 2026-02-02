/*
  # Add Service Branch to Warehouse Bill

  1. Changes
    - Add `service_branch_id` column (uuid, foreign key to branch_master)
    - Add `service_branch_name` column (text)

  2. Purpose
    - Store the service branch associated with the warehouse service
    - Links to the branch from customer_rate_master where the rate was selected
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warehouse_bill' AND column_name = 'service_branch_id'
  ) THEN
    ALTER TABLE warehouse_bill ADD COLUMN service_branch_id uuid REFERENCES branch_master(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warehouse_bill' AND column_name = 'service_branch_name'
  ) THEN
    ALTER TABLE warehouse_bill ADD COLUMN service_branch_name text;
  END IF;
END $$;
