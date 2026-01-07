/*
  # Create Company Master Table

  1. New Tables
    - `company_master`
      - `id` (uuid, primary key) - Unique identifier
      - `company_code` (text, unique) - Auto-generated code like 'C00001'
      - `company_name` (text) - Company name
      - `company_tagline` (text) - Company tagline/slogan
      - `company_address` (text) - Full company address
      - `city` (text) - City name
      - `state` (text) - State name
      - `pin_code` (text) - 6-digit pin code
      - `cin` (text) - Corporate Identification Number
      - `gstin` (text) - 15-character GST Identification Number
      - `contact_number` (text) - 10-digit contact number
      - `email` (text) - Email address
      - `website` (text) - Website URL
      - `logo_url` (text) - URL to uploaded company logo
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp
      - `created_by` (uuid) - User who created the record
      - `updated_by` (uuid) - User who last updated the record

  2. Security
    - Enable RLS on `company_master` table
    - Add policy for authenticated users to read all companies
    - Add policy for admin users to insert/update/delete companies

  3. Functions
    - Auto-generate company_code with format 'C00001', 'C00002', etc.
    - Auto-update updated_at timestamp on record modification
*/

-- Create the company_master table
CREATE TABLE IF NOT EXISTS company_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_code text UNIQUE NOT NULL,
  company_name text NOT NULL,
  company_tagline text,
  company_address text,
  city text,
  state text,
  pin_code text CHECK (pin_code ~ '^[0-9]{6}$'),
  cin text,
  gstin text CHECK (length(gstin) = 15 OR gstin IS NULL),
  contact_number text CHECK (contact_number ~ '^[0-9]{10}$'),
  email text CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  website text,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Create function to generate company code
CREATE OR REPLACE FUNCTION generate_company_code()
RETURNS text AS $$
DECLARE
  next_num integer;
  new_code text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(company_code FROM 2) AS integer)), 0) + 1
  INTO next_num
  FROM company_master;
  
  new_code := 'C' || LPAD(next_num::text, 5, '0');
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_company_master_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS company_master_updated_at ON company_master;
CREATE TRIGGER company_master_updated_at
  BEFORE UPDATE ON company_master
  FOR EACH ROW
  EXECUTE FUNCTION update_company_master_updated_at();

-- Enable RLS
ALTER TABLE company_master ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view companies
CREATE POLICY "Authenticated users can view companies"
  ON company_master
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admin users can insert companies
CREATE POLICY "Admin users can insert companies"
  ON company_master
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admin users can update companies
CREATE POLICY "Admin users can update companies"
  ON company_master
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

-- Policy: Only admin users can delete companies
CREATE POLICY "Admin users can delete companies"
  ON company_master
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_company_master_company_code ON company_master(company_code);
CREATE INDEX IF NOT EXISTS idx_company_master_company_name ON company_master(company_name);
