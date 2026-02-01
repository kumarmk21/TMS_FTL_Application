/*
  # Create Warehouse Bill Table
  
  1. New Tables
    - `warehouse_bill`
      - `bill_id` (uuid, primary key) - Unique bill ID
      - `bill_number` (text, unique) - Warehouse bill number (format: WB29100001)
      - `bill_date` (date) - Bill generation date
      - `bill_sub_date` (date) - Bill submission date
      - `bill_sub_type` (text) - Submission type (email, hand delivery, courier)
      - `bill_sub_details` (text) - Submission details/notes
      - `credit_days` (integer) - Credit period in days
      - `bill_due_date` (date) - Payment due date (bill_date + credit_days)
      - `bill_generation_branch` (uuid, foreign key) - Branch generating the bill
      - `billing_party_code` (text) - Customer code from customer_master
      - `billing_party_name` (text) - Customer name
      - `billing_party_id` (uuid, foreign key) - References customer_master
      - `bill_to_state` (text) - Customer state
      - `bill_to_gstin` (text) - Customer GSTIN
      - `bill_to_address` (text) - Customer billing address
      - `sac_code` (text) - Service Accounting Code
      - `sac_description` (text) - SAC description
      - `warehouse_charges` (numeric) - Base warehouse charges
      - `other_charges` (numeric) - Additional charges
      - `sub_total` (numeric) - Subtotal before taxes
      - `gst_percentage` (numeric) - GST rate percentage
      - `igst_amount` (numeric) - Inter-state GST amount
      - `cgst_amount` (numeric) - Central GST amount
      - `sgst_amount` (numeric) - State GST amount
      - `total_amount` (numeric) - Total bill amount including all taxes
      - `bill_status` (text) - Bill status (Draft, Submitted, Paid, Overdue, Cancelled)
      - `mr_date` (date) - Money receipt date
      - `mr_number` (text) - Money receipt number
      - `tds_applicable` (boolean) - TDS applicable flag
      - `tds_amount` (numeric) - TDS deducted amount
      - `deduction_amount` (numeric) - Other deductions
      - `net_amount` (numeric) - Net amount after deductions
      - `remarks` (text) - Additional remarks
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp
      - `created_by` (uuid) - User who created the record
  
  2. Security
    - Enable RLS on `warehouse_bill` table
    - Admin users can perform all operations
    - Branch users can access bills from their branch only
    - All users must be authenticated
  
  3. Indexes
    - Index on bill_number for quick lookups
    - Index on billing_party_code for customer queries
    - Index on bill_generation_branch for branch filtering
    - Index on bill_status for status-based queries
    - Index on created_at for chronological sorting
*/

-- Create warehouse_bill table
CREATE TABLE IF NOT EXISTS warehouse_bill (
  bill_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number text UNIQUE,
  bill_date date NOT NULL,
  bill_sub_date date,
  bill_sub_type text,
  bill_sub_details text,
  credit_days integer DEFAULT 0,
  bill_due_date date,
  bill_generation_branch uuid REFERENCES company_master(id),
  billing_party_code text,
  billing_party_name text,
  billing_party_id uuid REFERENCES customer_master(id),
  bill_to_state text,
  bill_to_gstin text,
  bill_to_address text,
  sac_code text,
  sac_description text,
  warehouse_charges numeric(15,2) DEFAULT 0,
  other_charges numeric(15,2) DEFAULT 0,
  sub_total numeric(15,2) DEFAULT 0,
  gst_percentage numeric(5,2) DEFAULT 0,
  igst_amount numeric(15,2) DEFAULT 0,
  cgst_amount numeric(15,2) DEFAULT 0,
  sgst_amount numeric(15,2) DEFAULT 0,
  total_amount numeric(15,2) DEFAULT 0,
  bill_status text DEFAULT 'Draft',
  mr_date date,
  mr_number text,
  tds_applicable boolean DEFAULT false,
  tds_amount numeric(15,2) DEFAULT 0,
  deduction_amount numeric(15,2) DEFAULT 0,
  net_amount numeric(15,2) DEFAULT 0,
  remarks text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE warehouse_bill ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_warehouse_bill_number ON warehouse_bill(bill_number);
CREATE INDEX IF NOT EXISTS idx_warehouse_bill_party_code ON warehouse_bill(billing_party_code);
CREATE INDEX IF NOT EXISTS idx_warehouse_bill_generation_branch ON warehouse_bill(bill_generation_branch);
CREATE INDEX IF NOT EXISTS idx_warehouse_bill_status ON warehouse_bill(bill_status);
CREATE INDEX IF NOT EXISTS idx_warehouse_bill_created_at ON warehouse_bill(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warehouse_bill_party_id ON warehouse_bill(billing_party_id);

-- RLS Policies for warehouse_bill

-- Admin users can view all warehouse bills
CREATE POLICY "Admin users can view all warehouse bills"
  ON warehouse_bill
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Branch users can view bills from their branch
CREATE POLICY "Branch users can view own branch warehouse bills"
  ON warehouse_bill
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN company_master ON company_master.id = warehouse_bill.bill_generation_branch
      JOIN branch_master ON branch_master.id = company_master.branch_id
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'user'
      AND profiles.branch_code = branch_master.branch_code
    )
  );

-- Authenticated users can create warehouse bills
CREATE POLICY "Authenticated users can create warehouse bills"
  ON warehouse_bill
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Admin users can update all warehouse bills
CREATE POLICY "Admin users can update all warehouse bills"
  ON warehouse_bill
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

-- Branch users can update bills from their branch
CREATE POLICY "Branch users can update own branch warehouse bills"
  ON warehouse_bill
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN company_master ON company_master.id = warehouse_bill.bill_generation_branch
      JOIN branch_master ON branch_master.id = company_master.branch_id
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'user'
      AND profiles.branch_code = branch_master.branch_code
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN company_master ON company_master.id = warehouse_bill.bill_generation_branch
      JOIN branch_master ON branch_master.id = company_master.branch_id
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'user'
      AND profiles.branch_code = branch_master.branch_code
    )
  );

-- Admin users can delete warehouse bills
CREATE POLICY "Admin users can delete warehouse bills"
  ON warehouse_bill
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
CREATE OR REPLACE FUNCTION update_warehouse_bill_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER warehouse_bill_updated_at
  BEFORE UPDATE ON warehouse_bill
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouse_bill_updated_at();

-- Create function to generate warehouse bill number
CREATE OR REPLACE FUNCTION generate_warehouse_bill_number()
RETURNS text AS $$
DECLARE
  next_number integer;
  new_bill_number text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(bill_number FROM 3) AS integer)), 29100000) + 1
  INTO next_number
  FROM warehouse_bill
  WHERE bill_number ~ '^WB[0-9]+$';
  
  new_bill_number := 'WB' || LPAD(next_number::text, 8, '0');
  RETURN new_bill_number;
END;
$$ LANGUAGE plpgsql;