/*
  # Add Branch Field to Customer Rate Master

  1. Changes
    - Add `branch_id` column (uuid, foreign key to branch_master)
    - Add `branch_name` column (text)
  
  2. Notes
    - Allows filtering rates by branch
    - Branch information stored for quick access
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_rate_master' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE customer_rate_master ADD COLUMN branch_id uuid REFERENCES branch_master(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_rate_master' AND column_name = 'branch_name'
  ) THEN
    ALTER TABLE customer_rate_master ADD COLUMN branch_name text;
  END IF;
END $$;
