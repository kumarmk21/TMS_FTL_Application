-- Create payment_receipts table for Bill Collection module
CREATE TABLE IF NOT EXISTS payment_receipts (
  pr_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_number text UNIQUE,
  bill_id text NOT NULL,
  bill_type text NOT NULL CHECK (bill_type IN ('lr', 'warehouse')),
  bill_number text NOT NULL,
  billing_party_code text,
  billing_party_name text,
  bill_amount numeric(15,2),
  payment_amount numeric(15,2) NOT NULL,
  payment_date date NOT NULL,
  payment_mode text CHECK (payment_mode IN ('Cash', 'Cheque', 'Bank Transfer', 'UPI')),
  reference_number text,
  remarks text,
  is_cancelled boolean DEFAULT false,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_payment_receipts" ON payment_receipts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "insert_payment_receipts" ON payment_receipts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "update_payment_receipts" ON payment_receipts
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "delete_payment_receipts" ON payment_receipts
  FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_payment_receipts_bill_id ON payment_receipts(bill_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_bill_type ON payment_receipts(bill_type);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_pr_number ON payment_receipts(pr_number);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_created_at ON payment_receipts(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_is_cancelled ON payment_receipts(is_cancelled);

CREATE OR REPLACE FUNCTION generate_pr_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(pr_number FROM 7) AS integer)),
    0
  ) + 1
  INTO next_num
  FROM payment_receipts
  WHERE pr_number ~ '^PR2910[0-9]+$';

  RETURN 'PR2910' || LPAD(next_num::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION set_pr_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.pr_number IS NULL THEN
    NEW.pr_number := generate_pr_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_set_pr_number
  BEFORE INSERT ON payment_receipts
  FOR EACH ROW
  EXECUTE FUNCTION set_pr_number();
