/*
  # Create Account Group Master Table

  1. New Tables
    - `account_group_master`
      - `id` (uuid, primary key)
      - `main_group` (text) - Main group category (Assets or Liabilities)
      - `sub_group` (text) - Sub group name
      - `active` (boolean, default true) - Active status
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
      - `created_by` (uuid, foreign key to profiles)

  2. Security
    - Enable RLS on `account_group_master` table
    - Add policies for authenticated users based on role
    - Admin users can perform all operations
    - Regular users can only view active records

  3. Indexes
    - Index on main_group for filtering
    - Index on active status
    - Index on created_by for tracking
*/

-- Create account_group_master table
CREATE TABLE IF NOT EXISTS account_group_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  main_group text NOT NULL CHECK (main_group IN ('Assets', 'Liabilities')),
  sub_group text NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE account_group_master ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view active account groups"
  ON account_group_master FOR SELECT
  TO authenticated
  USING (
    active = true OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can insert account groups"
  ON account_group_master FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can update account groups"
  ON account_group_master FOR UPDATE
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

CREATE POLICY "Admin users can delete account groups"
  ON account_group_master FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_account_group_main_group ON account_group_master(main_group);
CREATE INDEX IF NOT EXISTS idx_account_group_active ON account_group_master(active);
CREATE INDEX IF NOT EXISTS idx_account_group_created_by ON account_group_master(created_by);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_account_group_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER account_group_updated_at
  BEFORE UPDATE ON account_group_master
  FOR EACH ROW
  EXECUTE FUNCTION update_account_group_updated_at();