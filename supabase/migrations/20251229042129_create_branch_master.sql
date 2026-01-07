/*
  # Create Branch Master Table

  1. New Tables
    - `branch_master`
      - `id` (uuid, primary key) - Unique identifier for each branch
      - `branch_name` (text, unique, not null) - Name of the branch
      - `branch_code` (text, unique) - Optional code for the branch
      - `is_active` (boolean, default true) - Status of the branch
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record last update timestamp

  2. Security
    - Enable RLS on `branch_master` table
    - Add policy for authenticated users to read all branches
    - Add policy for authenticated users with admin role to insert branches
    - Add policy for authenticated users with admin role to update branches
    - Add policy for authenticated users with admin role to delete branches

  3. Data
    - Insert initial branch data from CSV file:
      - BADLAPUR
      - BHIWANDI
      - CALICUT
      - COCHIN
      - DELHI
      - HYDERABAD
      - RJ-BHIWADI

  4. Important Notes
    - Branch names are stored in uppercase for consistency
    - All branches are active by default
    - Timestamps are automatically managed with triggers
*/

-- Create branch_master table
CREATE TABLE IF NOT EXISTS branch_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_name text UNIQUE NOT NULL,
  branch_code text UNIQUE,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_branch_master_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS branch_master_updated_at_trigger ON branch_master;
CREATE TRIGGER branch_master_updated_at_trigger
  BEFORE UPDATE ON branch_master
  FOR EACH ROW
  EXECUTE FUNCTION update_branch_master_updated_at();

-- Insert initial branch data
INSERT INTO branch_master (branch_name, branch_code) VALUES
  ('BADLAPUR', 'BDP'),
  ('BHIWANDI', 'BHW'),
  ('CALICUT', 'CLT'),
  ('COCHIN', 'CCH'),
  ('DELHI', 'DEL'),
  ('HYDERABAD', 'HYD'),
  ('RJ-BHIWADI', 'BWD')
ON CONFLICT (branch_name) DO NOTHING;

-- Enable RLS
ALTER TABLE branch_master ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read branches
CREATE POLICY "Authenticated users can view all branches"
  ON branch_master
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Admin users can insert branches
CREATE POLICY "Admin users can insert branches"
  ON branch_master
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admin users can update branches
CREATE POLICY "Admin users can update branches"
  ON branch_master
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

-- Policy: Admin users can delete branches
CREATE POLICY "Admin users can delete branches"
  ON branch_master
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );