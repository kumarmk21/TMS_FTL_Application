/*
  # Add Income and Expenditure to Account Group Main Group Options

  1. Changes
    - Update the CHECK constraint on main_group column to include 'Income' and 'Expenditure'
    - This allows four main group types: Assets, Liabilities, Income, Expenditure

  2. Security
    - No RLS changes needed, existing policies remain in effect
*/

-- Drop the existing constraint
ALTER TABLE account_group_master 
  DROP CONSTRAINT IF EXISTS account_group_master_main_group_check;

-- Add new constraint with all four options
ALTER TABLE account_group_master
  ADD CONSTRAINT account_group_master_main_group_check
  CHECK (main_group IN ('Assets', 'Liabilities', 'Income', 'Expenditure'));