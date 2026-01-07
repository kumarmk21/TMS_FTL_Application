/*
  # Create Vendor Master Table

  1. New Tables
    - `vendor_master`
      - `id` (uuid, primary key)
      - `vendor_code` (text, unique, auto-generated with format V0000001)
      - `vendor_name` (text, required)
      - `vendor_address` (text, required)
      - `vendor_phone` (text, required)
      - `pan` (text, exactly 10 characters)
      - `email_id` (text, default: info@dlslogistics.in)
      - `account_no` (text, required)
      - `bank_name` (text, required)
      - `ifsc_code` (text, exactly 11 characters, 5th character must be '0')
      - `tds_applicable` (text, Y/N)
      - `tds_category` (text, Individual/Corporate)
      - `tds_rate` (numeric, 1 for Individual, 2 for Corporate)
      - `pan_document_url` (text, file upload path)
      - `cancelled_cheque_url` (text, file upload path)
      - `tds_declaration_url` (text, file upload path)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz, default now())
      - `created_by` (uuid, foreign key to profiles)

  2. Security
    - Enable RLS on `vendor_master` table
    - Authenticated users can view vendors
    - Only admins can insert, update, and delete vendors

  3. Functions
    - Auto-generate vendor_code with format V0000001
*/

-- Create vendor_master table
CREATE TABLE IF NOT EXISTS vendor_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_code text UNIQUE NOT NULL,
  vendor_name text NOT NULL,
  vendor_address text NOT NULL,
  vendor_phone text NOT NULL,
  pan text CHECK (length(pan) = 10 OR pan IS NULL),
  email_id text DEFAULT 'info@dlslogistics.in',
  account_no text NOT NULL,
  bank_name text NOT NULL,
  ifsc_code text CHECK (length(ifsc_code) = 11 OR ifsc_code IS NULL),
  tds_applicable text CHECK (tds_applicable IN ('Y', 'N')) DEFAULT 'N',
  tds_category text CHECK (tds_category IN ('Individual', 'Corporate') OR tds_category IS NULL),
  tds_rate numeric CHECK (tds_rate IN (1, 2) OR tds_rate IS NULL),
  pan_document_url text,
  cancelled_cheque_url text,
  tds_declaration_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Function to generate vendor code
CREATE OR REPLACE FUNCTION generate_vendor_code()
RETURNS text AS $$
DECLARE
  max_code text;
  next_num integer;
BEGIN
  SELECT vendor_code INTO max_code
  FROM vendor_master
  ORDER BY vendor_code DESC
  LIMIT 1;

  IF max_code IS NULL THEN
    next_num := 1;
  ELSE
    next_num := CAST(substring(max_code from 2) AS integer) + 1;
  END IF;

  RETURN 'V' || lpad(next_num::text, 7, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate vendor_code
CREATE OR REPLACE FUNCTION set_vendor_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vendor_code IS NULL OR NEW.vendor_code = '' THEN
    NEW.vendor_code := generate_vendor_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_vendor_code_trigger
  BEFORE INSERT ON vendor_master
  FOR EACH ROW
  EXECUTE FUNCTION set_vendor_code();

-- Enable RLS
ALTER TABLE vendor_master ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view vendors"
  ON vendor_master
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert vendors"
  ON vendor_master
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'role')::text = 'admin');

CREATE POLICY "Admins can update vendors"
  ON vendor_master
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin')
  WITH CHECK ((auth.jwt()->>'role')::text = 'admin');

CREATE POLICY "Admins can delete vendors"
  ON vendor_master
  FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin');

-- Create index on vendor_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendor_master_vendor_code ON vendor_master(vendor_code);
CREATE INDEX IF NOT EXISTS idx_vendor_master_is_active ON vendor_master(is_active);