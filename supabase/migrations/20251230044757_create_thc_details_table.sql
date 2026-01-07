/*
  # Create THC Details (Truck Hire Challan) Table

  1. New Tables
    - `thc_details`
      - `thc_id` (uuid, primary key) - Unique THC ID
      - `tran_id` (uuid, foreign key) - References booking_lr table
      - `thc_date` (date) - THC date
      - `thc_entry_date` (date) - THC entry date
      - `thc_number` (text, unique) - THC number
      - `thc_vendor` (uuid) - References vendor_master
      - `vehicle_number` (text) - Vehicle registration number
      - `driver_number` (text) - Driver contact number
      - `ft_trip_id` (text) - FT Trip ID
      - `thc_amount` (numeric) - THC base amount
      - `thc_loading_charges` (numeric) - THC loading charges (addition)
      - `thc_unloading_charges` (numeric) - THC unloading charges (addition)
      - `thc_detention_charges` (numeric) - THC detention charges (addition)
      - `thc_other_charges` (numeric) - THC other charges (addition)
      - `thc_deduction_delay` (numeric) - THC delay deduction (subtraction)
      - `thc_deduction_damage` (numeric) - THC damage deduction (subtraction)
      - `thc_munshiyana_amount` (numeric) - THC munshiyana amount (subtraction)
      - `thc_pod_delay_deduction` (numeric) - THC POD delay deduction (subtraction)
      - `thc_tds_amount` (numeric) - THC TDS amount (subtraction)
      - `thc_net_payable_amount` (numeric) - THC net payable amount (calculated)
      - `thc_advance_amount` (numeric) - THC advance payment amount
      - `thc_advance_date` (date) - THC advance payment date
      - `thc_advance_utr_number` (text) - THC advance UTR number
      - `thc_balance_amount` (numeric) - THC balance amount
      - `thc_balance_payment_date` (date) - THC balance payment date
      - `thc_balance_pmt_utr_details` (text) - THC balance payment UTR details
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp
      - `created_by` (uuid) - User who created the record

  2. Security
    - Enable RLS on `thc_details` table
    - Add policies for authenticated users based on role and branch access
    - Admin users can perform all operations
    - Branch users can only access THC data for LRs from their branch

  3. Indexes
    - Index on tran_id for relationship queries
    - Index on thc_number for quick lookups
    - Index on thc_vendor for vendor-based queries
*/

-- Create thc_details table
CREATE TABLE IF NOT EXISTS thc_details (
  thc_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tran_id uuid REFERENCES booking_lr(tran_id) ON DELETE CASCADE,
  thc_date date,
  thc_entry_date date DEFAULT CURRENT_DATE,
  thc_number text UNIQUE,
  thc_vendor uuid REFERENCES vendor_master(id),
  vehicle_number text,
  driver_number text,
  ft_trip_id text,
  thc_amount numeric(15,2) DEFAULT 0,
  thc_loading_charges numeric(15,2) DEFAULT 0,
  thc_unloading_charges numeric(15,2) DEFAULT 0,
  thc_detention_charges numeric(15,2) DEFAULT 0,
  thc_other_charges numeric(15,2) DEFAULT 0,
  thc_deduction_delay numeric(15,2) DEFAULT 0,
  thc_deduction_damage numeric(15,2) DEFAULT 0,
  thc_munshiyana_amount numeric(15,2) DEFAULT 0,
  thc_pod_delay_deduction numeric(15,2) DEFAULT 0,
  thc_tds_amount numeric(15,2) DEFAULT 0,
  thc_net_payable_amount numeric(15,2) DEFAULT 0,
  thc_advance_amount numeric(15,2) DEFAULT 0,
  thc_advance_date date,
  thc_advance_utr_number text,
  thc_balance_amount numeric(15,2) DEFAULT 0,
  thc_balance_payment_date date,
  thc_balance_pmt_utr_details text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE thc_details ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_thc_details_tran_id ON thc_details(tran_id);
CREATE INDEX IF NOT EXISTS idx_thc_details_thc_number ON thc_details(thc_number);
CREATE INDEX IF NOT EXISTS idx_thc_details_vendor ON thc_details(thc_vendor);
CREATE INDEX IF NOT EXISTS idx_thc_details_created_at ON thc_details(created_at DESC);

-- RLS Policies for thc_details

-- Admin users can select all THC records
CREATE POLICY "Admin users can view all THC details"
  ON thc_details
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Branch users can only view THC for LRs from their branch
CREATE POLICY "Branch users can view own branch THC details"
  ON thc_details
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN booking_lr ON booking_lr.tran_id = thc_details.tran_id
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'user'
      AND profiles.branch_code = booking_lr.booking_branch
    )
  );

-- Authenticated users can insert THC records
CREATE POLICY "Authenticated users can create THC details"
  ON thc_details
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Admin users can update all THC records
CREATE POLICY "Admin users can update all THC details"
  ON thc_details
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

-- Branch users can update THC for their branch LRs
CREATE POLICY "Branch users can update own branch THC details"
  ON thc_details
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN booking_lr ON booking_lr.tran_id = thc_details.tran_id
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'user'
      AND profiles.branch_code = booking_lr.booking_branch
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN booking_lr ON booking_lr.tran_id = thc_details.tran_id
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'user'
      AND profiles.branch_code = booking_lr.booking_branch
    )
  );

-- Admin users can delete THC records
CREATE POLICY "Admin users can delete THC details"
  ON thc_details
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_thc_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER thc_details_updated_at
  BEFORE UPDATE ON thc_details
  FOR EACH ROW
  EXECUTE FUNCTION update_thc_details_updated_at();