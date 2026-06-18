-- Create combined_payments parent table
CREATE TABLE IF NOT EXISTS combined_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id text UNIQUE NOT NULL,
  billing_party_code text NOT NULL,
  billing_party_name text,
  total_amount numeric(15,2) NOT NULL,
  payment_date date NOT NULL,
  payment_mode text CHECK (payment_mode IN ('Cash', 'Cheque', 'Bank Transfer', 'UPI')),
  reference_number text,
  remarks text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE combined_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_combined_payments" ON combined_payments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "insert_combined_payments" ON combined_payments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "update_combined_payments" ON combined_payments
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "delete_combined_payments" ON combined_payments
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Create combined_payment_bills child table
CREATE TABLE IF NOT EXISTS combined_payment_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  combined_payment_id uuid NOT NULL REFERENCES combined_payments(id) ON DELETE CASCADE,
  bill_id text NOT NULL,
  bill_type text NOT NULL CHECK (bill_type IN ('lr', 'warehouse')),
  bill_number text NOT NULL,
  bill_amount numeric(15,2),
  allocated_amount numeric(15,2) NOT NULL,
  pr_id uuid REFERENCES payment_receipts(pr_id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE combined_payment_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_combined_payment_bills" ON combined_payment_bills
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "insert_combined_payment_bills" ON combined_payment_bills
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "update_combined_payment_bills" ON combined_payment_bills
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "delete_combined_payment_bills" ON combined_payment_bills
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Link payment_receipts back to the parent combined payment
ALTER TABLE payment_receipts
  ADD COLUMN IF NOT EXISTS combined_payment_id uuid REFERENCES combined_payments(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_combined_payments_reference_id ON combined_payments(reference_id);
CREATE INDEX IF NOT EXISTS idx_combined_payments_billing_party ON combined_payments(billing_party_code);
CREATE INDEX IF NOT EXISTS idx_combined_payment_bills_combined_id ON combined_payment_bills(combined_payment_id);
CREATE INDEX IF NOT EXISTS idx_combined_payment_bills_bill_id ON combined_payment_bills(bill_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_combined_id ON payment_receipts(combined_payment_id);
