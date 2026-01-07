/*
  # Create Booking LR (Lorry Receipt) Table

  1. New Tables
    - `booking_lr`
      - `tran_id` (uuid, primary key) - Unique transaction ID
      - `enquiry_id` (uuid, foreign key) - References order_enquiry table
      - `bid_id` (text) - Bid identifier
      - `bid_date` (date) - Bid date
      - `enquiry_date` (date) - Enquiry date
      - `loading_date` (date) - Loading date
      - `expected_rate` (numeric) - Expected freight rate
      - `manual_lr_no` (text, unique) - Manual LR number (no duplicates)
      - `entry_date` (date) - Entry date
      - `lr_date` (date) - LR date
      - `group_id` (text) - Group identifier
      - `billing_party_code` (text) - Billing party code
      - `bill_to_gstin` (text) - Bill to GSTIN
      - `billing_party_name` (text) - Billing party name
      - `bill_to_address` (text) - Bill to address
      - `bill_to_state` (text) - Bill to state
      - `bill_to_state_ab` (text) - Bill to state abbreviation
      - `bill_to_state_code` (text) - Bill to state code
      - `est_del_date` (date) - Estimated delivery date
      - `act_del_date` (date) - Actual delivery date
      - `lr_sla_status` (text) - LR SLA status
      - `pod_recd_date` (date) - POD received date
      - `pod_recd_type` (text) - POD received type
      - `pod_courier_number` (text) - POD courier number
      - `pod_upload` (text) - POD upload file path/URL
      - `booking_branch` (text) - Booking branch code
      - `from_city` (text) - From city
      - `to_city` (text) - To city
      - `vehicle_type` (text) - Vehicle type
      - `pay_basis` (text) - Payment basis
      - `booking_type` (text) - Booking type
      - `product` (text) - Product type
      - `consignor` (text) - Consignor name
      - `consignee` (text) - Consignee name
      - `no_of_pkgs` (integer) - Number of packages
      - `act_wt` (numeric) - Actual weight
      - `chrg_wt` (numeric) - Chargeable weight
      - `invoice_number` (text) - Invoice number
      - `invoice_date` (date) - Invoice date
      - `invoice_value` (numeric) - Invoice value
      - `eway_bill_number` (text) - E-way bill number
      - `eway_bill_exp_date` (date) - E-way bill expiry date
      - `seal_no` (text) - Seal number
      - `lr_email_id` (text) - LR email ID
      - `customer_email_id` (text) - Customer email ID
      - `freight_rate` (numeric) - Freight rate
      - `freight_type` (text) - Freight type
      - `freight_amount` (numeric) - Freight amount
      - `docket_charges` (numeric) - Docket charges
      - `loading_charges` (numeric) - Loading charges
      - `unloading_charges` (numeric) - Unloading charges
      - `detention_charges` (numeric) - Detention charges
      - `penalties_oth_charges` (numeric) - Penalties and other charges
      - `subtotal` (numeric) - Subtotal amount
      - `gst_charge_type` (text) - GST charge type
      - `gst_amount` (numeric) - GST amount
      - `lr_total_amount` (numeric) - LR total amount
      - `lr_status` (text) - LR status
      - `lr_tracking_gps_status` (text) - LR tracking GPS status
      - `lr_financial_status` (text) - LR financial status
      - `lr_ops_status` (text) - LR operations status
      - `entry_datetime` (timestamptz) - Entry date and time
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp
      - `created_by` (uuid) - User who created the record

  2. Security
    - Enable RLS on `booking_lr` table
    - Add policies for authenticated users based on role and branch access
    - Admin users can perform all operations
    - Branch users can only access data from their assigned branch

  3. Indexes
    - Index on manual_lr_no for quick lookups
    - Index on booking_branch for branch-based filtering
    - Index on lr_status for status-based queries
    - Index on enquiry_id for relationship queries
*/

-- Create booking_lr table
CREATE TABLE IF NOT EXISTS booking_lr (
  tran_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid REFERENCES order_enquiry(id),
  bid_id text,
  bid_date date,
  enquiry_date date,
  loading_date date,
  expected_rate numeric(15,2),
  manual_lr_no text UNIQUE NOT NULL,
  entry_date date,
  lr_date date,
  group_id text,
  billing_party_code text,
  bill_to_gstin text,
  billing_party_name text,
  bill_to_address text,
  bill_to_state text,
  bill_to_state_ab text,
  bill_to_state_code text,
  est_del_date date,
  act_del_date date,
  lr_sla_status text,
  pod_recd_date date,
  pod_recd_type text,
  pod_courier_number text,
  pod_upload text,
  booking_branch text,
  from_city text,
  to_city text,
  vehicle_type text,
  pay_basis text,
  booking_type text,
  product text,
  consignor text,
  consignee text,
  no_of_pkgs integer DEFAULT 0,
  act_wt numeric(15,3),
  chrg_wt numeric(15,3),
  invoice_number text,
  invoice_date date,
  invoice_value numeric(15,2),
  eway_bill_number text,
  eway_bill_exp_date date,
  seal_no text,
  lr_email_id text,
  customer_email_id text,
  freight_rate numeric(15,2),
  freight_type text,
  freight_amount numeric(15,2) DEFAULT 0,
  docket_charges numeric(15,2) DEFAULT 0,
  loading_charges numeric(15,2) DEFAULT 0,
  unloading_charges numeric(15,2) DEFAULT 0,
  detention_charges numeric(15,2) DEFAULT 0,
  penalties_oth_charges numeric(15,2) DEFAULT 0,
  subtotal numeric(15,2) DEFAULT 0,
  gst_charge_type text,
  gst_amount numeric(15,2) DEFAULT 0,
  lr_total_amount numeric(15,2) DEFAULT 0,
  lr_status text DEFAULT 'Draft',
  lr_tracking_gps_status text,
  lr_financial_status text,
  lr_ops_status text,
  entry_datetime timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE booking_lr ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_booking_lr_manual_lr_no ON booking_lr(manual_lr_no);
CREATE INDEX IF NOT EXISTS idx_booking_lr_booking_branch ON booking_lr(booking_branch);
CREATE INDEX IF NOT EXISTS idx_booking_lr_status ON booking_lr(lr_status);
CREATE INDEX IF NOT EXISTS idx_booking_lr_enquiry_id ON booking_lr(enquiry_id);
CREATE INDEX IF NOT EXISTS idx_booking_lr_created_at ON booking_lr(created_at DESC);

-- RLS Policies for booking_lr

-- Admin users can select all records
CREATE POLICY "Admin users can view all booking LRs"
  ON booking_lr
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Branch users can only view LRs from their branch
CREATE POLICY "Branch users can view own branch booking LRs"
  ON booking_lr
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'user'
      AND profiles.branch_code = booking_lr.booking_branch
    )
  );

-- Authenticated users can insert LRs
CREATE POLICY "Authenticated users can create booking LRs"
  ON booking_lr
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Admin users can update all records
CREATE POLICY "Admin users can update all booking LRs"
  ON booking_lr
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

-- Branch users can update LRs from their branch
CREATE POLICY "Branch users can update own branch booking LRs"
  ON booking_lr
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'user'
      AND profiles.branch_code = booking_lr.booking_branch
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'user'
      AND profiles.branch_code = booking_lr.booking_branch
    )
  );

-- Admin users can delete records
CREATE POLICY "Admin users can delete booking LRs"
  ON booking_lr
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
CREATE OR REPLACE FUNCTION update_booking_lr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_lr_updated_at
  BEFORE UPDATE ON booking_lr
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_lr_updated_at();