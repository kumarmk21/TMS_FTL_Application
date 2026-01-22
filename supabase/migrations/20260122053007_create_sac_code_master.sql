/*
  # Create SAC Code Master Table

  1. New Tables
    - `sac_code_master`
      - `sac_id` (uuid, primary key) - Unique identifier for SAC code
      - `sac_code` (text, unique, not null) - SAC code (Services Accounting Code)
      - `sac_description` (text, not null) - Description of the SAC code
      - `is_active` (boolean) - Active status, default true
      - `created_by` (uuid) - User who created the record
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `sac_code_master` table
    - Add policies for authenticated users to read SAC codes
    - Add policies for admin users to insert, update, and delete SAC codes
    - Add policy to allow users to view only active SAC codes unless they are admin

  3. Indexes
    - Add index on sac_code for faster lookups
    - Add index on is_active for filtered queries
*/

CREATE TABLE IF NOT EXISTS sac_code_master (
  sac_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sac_code text UNIQUE NOT NULL,
  sac_description text NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sac_code_master_sac_code ON sac_code_master(sac_code);
CREATE INDEX IF NOT EXISTS idx_sac_code_master_is_active ON sac_code_master(is_active);

ALTER TABLE sac_code_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active SAC codes"
  ON sac_code_master
  FOR SELECT
  TO authenticated
  USING (
    is_active = true OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can insert SAC codes"
  ON sac_code_master
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can update SAC codes"
  ON sac_code_master
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

CREATE POLICY "Admin users can delete SAC codes"
  ON sac_code_master
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );