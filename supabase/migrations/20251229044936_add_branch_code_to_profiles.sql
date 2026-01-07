/*
  # Add Branch Code to Profiles

  1. Changes to profiles table
    - Add `branch_code` column (text, nullable initially)
    - Add foreign key constraint to branch_master table
    - Add index on branch_code for faster queries
  
  2. Important Notes
    - Branch code determines report access level:
      - HQTR (Headquarters) users can view all branches
      - Other branch users can only view their own branch data
    - This field will be required for future report filtering
    - All existing users will need to have a branch assigned
*/

-- Add branch_code column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'branch_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN branch_code text;
  END IF;
END $$;

-- Add foreign key constraint to branch_master
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_branch_code_fkey'
  ) THEN
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_branch_code_fkey 
    FOREIGN KEY (branch_code) 
    REFERENCES branch_master(branch_code)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

-- Create index on branch_code for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_branch_code ON profiles(branch_code);

-- Add helpful comment
COMMENT ON COLUMN profiles.branch_code IS 'Branch code for user access control. HQTR users have access to all branches, others restricted to their branch.';
