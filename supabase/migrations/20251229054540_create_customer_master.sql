/*
  # Create Customer Master Table

  1. New Tables
    - `customer_master`
      - `id` (uuid, primary key) - Unique identifier
      - `customer_id` (text, unique, not null) - Customer ID (e.g., SH0000001)
      - `customer_name` (text, not null) - Name of the customer
      - `is_active` (boolean) - Active status
      - `group_id` (text) - Group/category identifier
      - `sales_person` (text) - Assigned salesperson
      - `gstin` (text) - GST identification number
      - `customer_address` (text) - Customer address
      - `customer_city` (text) - City
      - `customer_state` (text) - State
      - `customer_phone` (text) - Phone number
      - `customer_email` (text) - Primary email address
      - `lr_mail_id` (text) - Additional email addresses (LR mail IDs)
      - `customer_contact` (text) - Contact person name
      - `contract_type` (text) - Contract type (PAID, TBB, TOPAY)
      - `credit_days` (integer) - Credit days allowed
      - `date_added` (text) - Date customer was added
      - `created_by` (text) - User who created the record
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Security
    - Enable RLS on `customer_master` table
    - Add policy for authenticated users to read customer data
    - Add policy for admin users to insert customer data
    - Add policy for admin users to update customer data
    - Add policy for admin users to delete customer data

  3. Indexes
    - Add unique index on customer_id for fast lookups
    - Add index on customer_name for searching
    - Add index on is_active for filtering
    - Add index on group_id for grouping
    - Add index on customer_city and customer_state for location-based queries
*/

CREATE TABLE IF NOT EXISTS customer_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  is_active boolean DEFAULT true,
  group_id text,
  sales_person text,
  gstin text,
  customer_address text,
  customer_city text,
  customer_state text,
  customer_phone text,
  customer_email text,
  lr_mail_id text,
  customer_contact text,
  contract_type text,
  credit_days integer DEFAULT 0,
  date_added text,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_master_customer_id ON customer_master(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_master_name ON customer_master(customer_name);
CREATE INDEX IF NOT EXISTS idx_customer_master_active ON customer_master(is_active);
CREATE INDEX IF NOT EXISTS idx_customer_master_group_id ON customer_master(group_id);
CREATE INDEX IF NOT EXISTS idx_customer_master_city ON customer_master(customer_city);
CREATE INDEX IF NOT EXISTS idx_customer_master_state ON customer_master(customer_state);

-- Enable Row Level Security
ALTER TABLE customer_master ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read customer data
CREATE POLICY "Authenticated users can read customer data"
  ON customer_master
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Admin users can insert customer data
CREATE POLICY "Admin users can insert customer data"
  ON customer_master
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admin users can update customer data
CREATE POLICY "Admin users can update customer data"
  ON customer_master
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

-- Policy: Admin users can delete customer data
CREATE POLICY "Admin users can delete customer data"
  ON customer_master
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );