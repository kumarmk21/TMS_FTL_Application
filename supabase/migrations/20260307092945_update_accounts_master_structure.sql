/*
  # Update Accounts Master Table Structure

  1. Changes
    - Rename account_id to id
    - Remove account_code column (not needed)
    - Rename account_name to accounting_head
    - Add sub_group text column
    - Add main_group text column
    - Remove account_group_id (replaced by sub_group and main_group)
    - Remove opening_balance and current_balance (not needed for this use case)
    - Rename is_active to active
    - Update indexes and constraints

  2. Security
    - Update RLS policies to match new structure
*/

-- Drop existing policies and constraints first
DROP POLICY IF EXISTS "All authenticated users can view accounts" ON accounts_master;
DROP POLICY IF EXISTS "Admin users can insert accounts" ON accounts_master;
DROP POLICY IF EXISTS "Admin users can update accounts" ON accounts_master;
DROP POLICY IF EXISTS "Admin users can delete accounts" ON accounts_master;

-- Rename columns
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts_master' AND column_name = 'account_id') THEN
    ALTER TABLE accounts_master RENAME COLUMN account_id TO id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts_master' AND column_name = 'account_name') THEN
    ALTER TABLE accounts_master RENAME COLUMN account_name TO accounting_head;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts_master' AND column_name = 'is_active') THEN
    ALTER TABLE accounts_master RENAME COLUMN is_active TO active;
  END IF;
END $$;

-- Drop columns we don't need
ALTER TABLE accounts_master DROP COLUMN IF EXISTS account_code;
ALTER TABLE accounts_master DROP COLUMN IF EXISTS opening_balance;
ALTER TABLE accounts_master DROP COLUMN IF EXISTS current_balance;
ALTER TABLE accounts_master DROP COLUMN IF EXISTS account_group_id;

-- Add new columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts_master' AND column_name = 'sub_group') THEN
    ALTER TABLE accounts_master ADD COLUMN sub_group text NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts_master' AND column_name = 'main_group') THEN
    ALTER TABLE accounts_master ADD COLUMN main_group text NOT NULL DEFAULT 'Assets';
  END IF;
END $$;

-- Add constraint for main_group
ALTER TABLE accounts_master DROP CONSTRAINT IF EXISTS accounts_master_main_group_check;
ALTER TABLE accounts_master
  ADD CONSTRAINT accounts_master_main_group_check
  CHECK (main_group IN ('Assets', 'Liabilities', 'Income', 'Expenditure'));

-- Drop old indexes
DROP INDEX IF EXISTS idx_accounts_master_sub_group_id;

-- Add new indexes
CREATE INDEX IF NOT EXISTS idx_accounts_master_sub_group ON accounts_master(sub_group);
CREATE INDEX IF NOT EXISTS idx_accounts_master_active ON accounts_master(active);
CREATE INDEX IF NOT EXISTS idx_accounts_master_main_group ON accounts_master(main_group);

-- Recreate RLS policies
CREATE POLICY "All authenticated users can view accounts"
  ON accounts_master
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can insert accounts"
  ON accounts_master
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can update accounts"
  ON accounts_master
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete accounts"
  ON accounts_master
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );