/*
  # Create Bill Billing Party Change Audit Log

  1. New Tables
    - `bill_billing_party_changes`
      - `id` (uuid, primary key) - Unique identifier
      - `bill_id` (uuid, not null) - The lr_bill that was changed
      - `bill_number` (text, not null) - Bill number for reference
      - `tran_id` (text, nullable) - The booking_lr tran_id linked to this bill
      - `old_billing_party_code` (text, nullable) - Previous billing party code
      - `old_billing_party_name` (text, nullable) - Previous billing party name
      - `old_bill_to_gstin` (text, nullable) - Previous customer GSTIN
      - `old_bill_to_state` (text, nullable) - Previous bill-to state
      - `old_bill_to_address` (text, nullable) - Previous bill-to address
      - `new_billing_party_code` (text, nullable) - New billing party code
      - `new_billing_party_name` (text, nullable) - New billing party name
      - `new_bill_to_gstin` (text, nullable) - New customer GSTIN
      - `new_bill_to_state` (text, nullable) - New bill-to state
      - `new_bill_to_address` (text, nullable) - New bill-to address
      - `change_reason` (text, nullable) - Optional reason for the change
      - `changed_by` (uuid, references auth.users) - User who made the change
      - `changed_at` (timestamptz, default now()) - When the change was made

  2. Security
    - Enable RLS on `bill_billing_party_changes` table
    - All authenticated users can view the audit log
    - All authenticated users can insert audit entries (changes are logged by the app)

  3. Notes
    - This is an append-only audit table. No UPDATE or DELETE policies are defined.
    - Records both old and new values for full traceability.
*/

CREATE TABLE IF NOT EXISTS bill_billing_party_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL,
  bill_number text NOT NULL,
  tran_id text,
  old_billing_party_code text,
  old_billing_party_name text,
  old_bill_to_gstin text,
  old_bill_to_state text,
  old_bill_to_address text,
  new_billing_party_code text,
  new_billing_party_name text,
  new_bill_to_gstin text,
  new_bill_to_state text,
  new_bill_to_address text,
  change_reason text,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now()
);

ALTER TABLE bill_billing_party_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view billing party changes" ON bill_billing_party_changes;
CREATE POLICY "Authenticated users can view billing party changes"
  ON bill_billing_party_changes
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can log billing party changes" ON bill_billing_party_changes;
CREATE POLICY "Authenticated users can log billing party changes"
  ON bill_billing_party_changes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_bill_billing_party_changes_bill_id ON bill_billing_party_changes(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_billing_party_changes_changed_at ON bill_billing_party_changes(changed_at);
