/*
  # Create LR Bill (Billing Details) Table

  1. New Tables
    - `lr_bill`
      - `bill_id` (uuid, primary key) - Unique bill ID
      - `tran_id` (uuid, foreign key) - References booking_lr table
      - `lr_bill_number` (text, unique) - LR bill number
      - `lr_bill_date` (date) - LR bill date
      - `lr_bill_sub_date` (date) - LR bill submission date
      - `lr_bill_sub_type` (text) - LR bill submission type (email, hand delivery, courier, etc.)
      - `lr_bill_sub_details` (text) - LR bill submission details
      - `lr_bill_due_date` (date) - LR bill due date
      - `lr_bill_status` (text) - LR bill status (Draft, Submitted, Paid, Overdue, etc.)
      - `lr_bill_mr_date` (date) - LR bill money receipt date
      - `lr_bill_mr_number` (text) - LR bill money receipt number
      - `lr_bill_tds_applicable` (boolean) - LR bill TDS applicable flag
      - `lr_bill_tds_amount` (numeric) - LR bill TDS amount
      - `lr_bill_deduction_amount` (numeric) - LR bill deduction amount
      - `lr_bill_mr_net_amount` (numeric) - LR bill money receipt net amount
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp
      - `created_by` (uuid) - User who created the record

  2. Security
    - Enable RLS on `lr_bill` table
    - Add policies for authenticated users based on role and branch access
    - Admin users can perform all operations
    - Branch users can only access bills for LRs from their branch

  3. Indexes
    - Index on tran_id for relationship queries
    - Index on lr_bill_number for quick lookups
    - Index on lr_bill_status for status-based queries
*/

-- Create lr_bill table
CREATE TABLE IF NOT EXISTS lr_bill (
  bill_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tran_id uuid REFERENCES booking_lr(tran_id) ON DELETE CASCADE,
  lr_bill_number text UNIQUE,
  lr_bill_date date,
  lr_bill_sub_date date,
  lr_bill_sub_type text,
  lr_bill_sub_details text,
  lr_bill_due_date date,
  lr_bill_status text DEFAULT 'Draft',
  lr_bill_mr_date date,
  lr_bill_mr_number text,
  lr_bill_tds_applicable boolean DEFAULT false,
  lr_bill_tds_amount numeric(15,2) DEFAULT 0,
  lr_bill_deduction_amount numeric(15,2) DEFAULT 0,
  lr_bill_mr_net_amount numeric(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE lr_bill ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lr_bill_tran_id ON lr_bill(tran_id);
CREATE INDEX IF NOT EXISTS idx_lr_bill_number ON lr_bill(lr_bill_number);
CREATE INDEX IF NOT EXISTS idx_lr_bill_status ON lr_bill(lr_bill_status);
CREATE INDEX IF NOT EXISTS idx_lr_bill_created_at ON lr_bill(created_at DESC);

-- RLS Policies for lr_bill

-- Admin users can select all bill records
CREATE POLICY "Admin users can view all LR bills"
  ON lr_bill
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Branch users can only view bills for LRs from their branch
CREATE POLICY "Branch users can view own branch LR bills"
  ON lr_bill
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN booking_lr ON booking_lr.tran_id = lr_bill.tran_id
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'user'
      AND profiles.branch_code = booking_lr.booking_branch
    )
  );

-- Authenticated users can insert bill records
CREATE POLICY "Authenticated users can create LR bills"
  ON lr_bill
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Admin users can update all bill records
CREATE POLICY "Admin users can update all LR bills"
  ON lr_bill
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

-- Branch users can update bills for their branch LRs
CREATE POLICY "Branch users can update own branch LR bills"
  ON lr_bill
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN booking_lr ON booking_lr.tran_id = lr_bill.tran_id
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'user'
      AND profiles.branch_code = booking_lr.booking_branch
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN booking_lr ON booking_lr.tran_id = lr_bill.tran_id
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'user'
      AND profiles.branch_code = booking_lr.booking_branch
    )
  );

-- Admin users can delete bill records
CREATE POLICY "Admin users can delete LR bills"
  ON lr_bill
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
CREATE OR REPLACE FUNCTION update_lr_bill_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lr_bill_updated_at
  BEFORE UPDATE ON lr_bill
  FOR EACH ROW
  EXECUTE FUNCTION update_lr_bill_updated_at();