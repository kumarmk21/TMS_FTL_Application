/*
  # Create Order/Enquiry Table

  1. New Tables
    - `order_enquiry`
      - `id` (uuid, primary key)
      - `enq_id` (text, unique, auto-generated with format ENQ0000001)
      - `entry_date` (timestamptz, default now(), non-editable)
      - `loading_date` (date, required, current and future dates only)
      - `customer_id` (uuid, foreign key to customer_master)
      - `origin_id` (uuid, foreign key to city_master)
      - `destination_id` (uuid, foreign key to city_master)
      - `vehicle_type_id` (uuid, foreign key to vehicle_master)
      - `weight_mt` (numeric, weight in metric tons, required)
      - `expected_rate` (numeric, optional)
      - `status` (text, default 'Open')
      - `created_by` (uuid, foreign key to profiles)

  2. Security
    - Enable RLS on `order_enquiry` table
    - Authenticated users can view all enquiries
    - Authenticated users can insert new enquiries
    - Only admins can update and delete enquiries

  3. Functions
    - Auto-generate enq_id with format ENQ0000001
    - Validate loading_date is not in the past
*/

-- Create order_enquiry table
CREATE TABLE IF NOT EXISTS order_enquiry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enq_id text UNIQUE NOT NULL,
  entry_date timestamptz DEFAULT now() NOT NULL,
  loading_date date NOT NULL,
  customer_id uuid NOT NULL REFERENCES customer_master(id),
  origin_id uuid NOT NULL REFERENCES city_master(id),
  destination_id uuid NOT NULL REFERENCES city_master(id),
  vehicle_type_id uuid NOT NULL REFERENCES vehicle_master(id),
  weight_mt numeric NOT NULL CHECK (weight_mt > 0),
  expected_rate numeric CHECK (expected_rate >= 0 OR expected_rate IS NULL),
  status text DEFAULT 'Open' NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id),
  CONSTRAINT loading_date_not_past CHECK (loading_date >= CURRENT_DATE)
);

-- Function to generate enquiry ID
CREATE OR REPLACE FUNCTION generate_enq_id()
RETURNS text AS $$
DECLARE
  max_id text;
  next_num integer;
BEGIN
  SELECT enq_id INTO max_id
  FROM order_enquiry
  ORDER BY enq_id DESC
  LIMIT 1;

  IF max_id IS NULL THEN
    next_num := 1;
  ELSE
    next_num := CAST(substring(max_id from 4) AS integer) + 1;
  END IF;

  RETURN 'ENQ' || lpad(next_num::text, 7, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate enq_id
CREATE OR REPLACE FUNCTION set_enq_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.enq_id IS NULL OR NEW.enq_id = '' THEN
    NEW.enq_id := generate_enq_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_enq_id_trigger
  BEFORE INSERT ON order_enquiry
  FOR EACH ROW
  EXECUTE FUNCTION set_enq_id();

-- Enable RLS
ALTER TABLE order_enquiry ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view enquiries"
  ON order_enquiry
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert enquiries"
  ON order_enquiry
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update enquiries"
  ON order_enquiry
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

CREATE POLICY "Admins can delete enquiries"
  ON order_enquiry
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
CREATE INDEX IF NOT EXISTS idx_order_enquiry_enq_id ON order_enquiry(enq_id);
CREATE INDEX IF NOT EXISTS idx_order_enquiry_customer_id ON order_enquiry(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_enquiry_loading_date ON order_enquiry(loading_date);
CREATE INDEX IF NOT EXISTS idx_order_enquiry_status ON order_enquiry(status);
CREATE INDEX IF NOT EXISTS idx_order_enquiry_created_by ON order_enquiry(created_by);
