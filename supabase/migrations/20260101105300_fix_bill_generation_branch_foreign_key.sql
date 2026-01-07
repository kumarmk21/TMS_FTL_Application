/*
  # Fix Bill Generation Branch Foreign Key

  1. Changes
    - Drop the incorrect foreign key constraint on bill_generation_branch that references company_master(id)
    - Add correct foreign key constraint on bill_generation_branch that references branch_master(id)

  2. Reason
    - Bill generation branch should store branch_id from company_master, which references branch_master(id)
    - The field should directly reference branch_master table for proper data integrity
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'lr_bill_bill_generation_branch_fkey'
    AND table_name = 'lr_bill'
  ) THEN
    ALTER TABLE lr_bill DROP CONSTRAINT lr_bill_bill_generation_branch_fkey;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'lr_bill_bill_generation_branch_branch_fkey'
    AND table_name = 'lr_bill'
  ) THEN
    ALTER TABLE lr_bill
    ADD CONSTRAINT lr_bill_bill_generation_branch_branch_fkey
    FOREIGN KEY (bill_generation_branch) REFERENCES branch_master(id);
  END IF;
END $$;