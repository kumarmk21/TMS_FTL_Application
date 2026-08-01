/*
  # Create Company GST Numbers Table

  1. New Tables
    - `company_gst_numbers`
      - `id` (uuid, primary key) - Unique identifier
      - `company_id` (uuid, foreign key to company_master) - Company this GST number belongs to
      - `gst_number` (text, not null) - The GST identification number
      - `label` (text, nullable) - Optional friendly name e.g. "Maharashtra Office"
      - `custom_fields` (jsonb, default '[]') - Array of { label, value } pairs for user-defined metadata
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp
      - `created_by` (uuid) - User who created the record
      - `updated_by` (uuid) - User who last updated the record

  2. Security
    - Enable RLS on `company_gst_numbers` table
    - All authenticated users can read GST numbers (needed for bill generation dropdowns)
    - Only admin users can insert/update/delete GST numbers

  3. Notes
    - Cascades on delete: if a company is deleted, its GST numbers are removed automatically
    - custom_fields stored as JSONB array of objects with { label: string, value: string }
*/

CREATE TABLE IF NOT EXISTS company_gst_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES company_master(id) ON DELETE CASCADE,
  gst_number text NOT NULL,
  label text,
  custom_fields jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE company_gst_numbers ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view company GST numbers
DROP POLICY IF EXISTS "Authenticated users can view company gst numbers" ON company_gst_numbers;
CREATE POLICY "Authenticated users can view company gst numbers"
  ON company_gst_numbers
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admin users can insert company GST numbers
DROP POLICY IF EXISTS "Admin users can insert company gst numbers" ON company_gst_numbers;
CREATE POLICY "Admin users can insert company gst numbers"
  ON company_gst_numbers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admin users can update company GST numbers
DROP POLICY IF EXISTS "Admin users can update company gst numbers" ON company_gst_numbers;
CREATE POLICY "Admin users can update company gst numbers"
  ON company_gst_numbers
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

-- Policy: Only admin users can delete company GST numbers
DROP POLICY IF EXISTS "Admin users can delete company gst numbers" ON company_gst_numbers;
CREATE POLICY "Admin users can delete company gst numbers"
  ON company_gst_numbers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_company_gst_numbers_company_id ON company_gst_numbers(company_id);
CREATE INDEX IF NOT EXISTS idx_company_gst_numbers_gst_number ON company_gst_numbers(gst_number);
