/*
  # Create Customer Rate Master Table
  
  1. New Tables
    - `customer_rate_master`
      - `rate_id` (uuid, primary key) - Unique rate ID
      - `customer_id` (text) - Customer code
      - `customer_master_id` (uuid, foreign key) - References customer_master table
      - `customer_name` (text) - Customer name
      - `is_active` (boolean) - Active status of rate
      - `sac_code` (text) - Service Accounting Code
      - `sac_description` (text) - SAC description
      - `from_city` (text) - Origin city name
      - `from_city_id` (uuid, foreign key) - References city_master
      - `to_city` (text) - Destination city name
      - `to_city_id` (uuid, foreign key) - References city_master
      - `vehicle_type` (text) - Vehicle type name
      - `vehicle_type_id` (uuid, foreign key) - References vehicle_master
      - `service_type` (text) - Type of service (e.g., Express, Standard, Economy)
      - `service_type_rate` (numeric) - Rate for the service
      - `gst_charge_type` (text) - GST charge type (IGST, CGST+SGST)
      - `gst_percentage` (numeric) - GST percentage applicable
      - `effective_from` (date) - Rate effective from date
      - `effective_to` (date) - Rate valid until date
      - `remarks` (text) - Additional remarks or notes
      - `created_by` (uuid, foreign key) - User who created the record
      - `created_date` (date) - Record creation date
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_by` (uuid, foreign key) - User who last updated the record
      - `updated_at` (timestamptz) - Record update timestamp
  
  2. Security
    - Enable RLS on `customer_rate_master` table
    - Admin users can perform all operations
    - Branch users can view and manage rates
    - All users must be authenticated
  
  3. Indexes
    - Index on customer_id for customer queries
    - Index on from_city_id and to_city_id for route queries
    - Index on vehicle_type_id for vehicle type filtering
    - Index on is_active for active rate queries
    - Composite index on customer_id, from_city_id, to_city_id for rate lookups
*/

-- Create customer_rate_master table
CREATE TABLE IF NOT EXISTS customer_rate_master (
  rate_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text,
  customer_master_id uuid REFERENCES customer_master(id),
  customer_name text,
  is_active boolean DEFAULT true,
  sac_code text,
  sac_description text,
  from_city text,
  from_city_id uuid REFERENCES city_master(id),
  to_city text,
  to_city_id uuid REFERENCES city_master(id),
  vehicle_type text,
  vehicle_type_id uuid REFERENCES vehicle_master(id),
  service_type text,
  service_type_rate numeric(15,2) DEFAULT 0,
  gst_charge_type text,
  gst_percentage numeric(5,2) DEFAULT 0,
  effective_from date,
  effective_to date,
  remarks text,
  created_by uuid REFERENCES auth.users(id),
  created_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE customer_rate_master ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_rate_customer_id ON customer_rate_master(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_rate_customer_master_id ON customer_rate_master(customer_master_id);
CREATE INDEX IF NOT EXISTS idx_customer_rate_from_city_id ON customer_rate_master(from_city_id);
CREATE INDEX IF NOT EXISTS idx_customer_rate_to_city_id ON customer_rate_master(to_city_id);
CREATE INDEX IF NOT EXISTS idx_customer_rate_vehicle_type_id ON customer_rate_master(vehicle_type_id);
CREATE INDEX IF NOT EXISTS idx_customer_rate_is_active ON customer_rate_master(is_active);
CREATE INDEX IF NOT EXISTS idx_customer_rate_service_type ON customer_rate_master(service_type);
CREATE INDEX IF NOT EXISTS idx_customer_rate_effective_dates ON customer_rate_master(effective_from, effective_to);

-- Composite index for common rate lookups
CREATE INDEX IF NOT EXISTS idx_customer_rate_lookup 
  ON customer_rate_master(customer_id, from_city_id, to_city_id, vehicle_type_id, is_active);

-- RLS Policies for customer_rate_master

-- Admin users can view all rates
CREATE POLICY "Admin users can view all customer rates"
  ON customer_rate_master
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Branch users can view all rates
CREATE POLICY "Branch users can view all customer rates"
  ON customer_rate_master
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'user'
    )
  );

-- Authenticated users can create customer rates
CREATE POLICY "Authenticated users can create customer rates"
  ON customer_rate_master
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Admin users can update all customer rates
CREATE POLICY "Admin users can update all customer rates"
  ON customer_rate_master
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

-- Branch users can update customer rates
CREATE POLICY "Branch users can update customer rates"
  ON customer_rate_master
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'user'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'user'
    )
  );

-- Admin users can delete customer rates
CREATE POLICY "Admin users can delete customer rates"
  ON customer_rate_master
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create trigger to update updated_at timestamp and updated_by
CREATE OR REPLACE FUNCTION update_customer_rate_master_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customer_rate_master_updated_at
  BEFORE UPDATE ON customer_rate_master
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_rate_master_updated_at();