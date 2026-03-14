/*
  # Create Consol_Bill_Data Table

  ## Summary
  Creates the consolidated bill data table to store consolidation billing records generated from individual LR bills.

  ## New Tables
  - `consol_bill_data`
    - `tran_id` (uuid, primary key, auto-generated)
    - `consol_bill_no` (text, unique, required) - Consolidation bill number
    - `consol_bill_date` (date, required) - Bill date
    - `consol_billing_party` (text, required) - Billing party identifier
    - `consol_bill_amount` (numeric(12,2)) - Total bill amount
    - `consol_bill_pending_amount` (numeric(12,2)) - Pending amount, defaults to consol_bill_amount on insert
    - `consol_bill_sub_date` (date) - Submission date
    - `consol_bill_submitted_to` (text) - Submitted to person/department
    - `consol_bill_ack_url` (text) - URL of uploaded acknowledgement file
    - `consol_bill_ack_filename` (text) - Original filename of acknowledgement
    - `consol_bill_status` (text) - Status enum: Draft, Submitted, Partially Paid, Fully Paid, Disputed
    - `created_by` (uuid, references auth.users)
    - `created_date` (timestamptz, auto)
    - `updated_by` (uuid, references auth.users)
    - `updated_date` (timestamptz, auto)

  ## Security
  - Enable RLS on `consol_bill_data`
  - Authenticated users can select, insert, update records
  - Only admin role can delete

  ## Notes
  - A trigger auto-sets `consol_bill_pending_amount = consol_bill_amount` on INSERT if pending amount is null
  - `updated_date` is auto-updated via trigger on any row update
*/

CREATE TABLE IF NOT EXISTS consol_bill_data (
  tran_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consol_bill_no text UNIQUE NOT NULL,
  consol_bill_date date NOT NULL,
  consol_billing_party text NOT NULL,
  consol_bill_amount numeric(12, 2) DEFAULT 0,
  consol_bill_pending_amount numeric(12, 2) DEFAULT 0,
  consol_bill_sub_date date,
  consol_bill_submitted_to text,
  consol_bill_ack_url text,
  consol_bill_ack_filename text,
  consol_bill_status text NOT NULL DEFAULT 'Draft' CHECK (consol_bill_status IN ('Draft', 'Submitted', 'Partially Paid', 'Fully Paid', 'Disputed')),
  created_by uuid REFERENCES auth.users(id),
  created_date timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  updated_date timestamptz DEFAULT now()
);

ALTER TABLE consol_bill_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view consol bills"
  ON consol_bill_data FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert consol bills"
  ON consol_bill_data FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update consol bills"
  ON consol_bill_data FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can delete consol bills"
  ON consol_bill_data FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION set_consol_bill_pending_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.consol_bill_pending_amount IS NULL OR NEW.consol_bill_pending_amount = 0 THEN
    NEW.consol_bill_pending_amount := NEW.consol_bill_amount;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_consol_bill_pending_amount
  BEFORE INSERT ON consol_bill_data
  FOR EACH ROW
  EXECUTE FUNCTION set_consol_bill_pending_amount();

CREATE OR REPLACE FUNCTION update_consol_bill_updated_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_date := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_consol_bill_updated_date
  BEFORE UPDATE ON consol_bill_data
  FOR EACH ROW
  EXECUTE FUNCTION update_consol_bill_updated_date();

CREATE INDEX IF NOT EXISTS idx_consol_bill_data_billing_party ON consol_bill_data(consol_billing_party);
CREATE INDEX IF NOT EXISTS idx_consol_bill_data_status ON consol_bill_data(consol_bill_status);
CREATE INDEX IF NOT EXISTS idx_consol_bill_data_date ON consol_bill_data(consol_bill_date);
