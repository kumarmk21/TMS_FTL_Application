/*
  # Create Customer GST Master Table

  1. New Tables
    - `customer_gst_master`
      - `id` (uuid, primary key)
      - `customer_code` (text, references customer_master.customer_id) - Mandatory
      - `customer_name` (text) - Auto-populated from customer_master
      - `bill_to_address` (text) - Mandatory
      - `state_id` (uuid, references state_master.id)
      - `state_code` (text) - From state_master
      - `alpha_code` (text) - From state_master
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid, references auth.users)

  2. Security
    - Enable RLS on `customer_gst_master` table
    - Add policies for authenticated users to:
      - View all customer GST records (SELECT)
      - Create new customer GST records (INSERT)
      - Update existing customer GST records (UPDATE)
      - Admin users can delete customer GST records (DELETE)

  3. Important Notes
    - customer_code is mandatory and references customer_master
    - bill_to_address is mandatory
    - State information is linked through state_master table
*/

CREATE TABLE IF NOT EXISTS customer_gst_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code text NOT NULL,
  customer_name text NOT NULL,
  bill_to_address text NOT NULL,
  state_id uuid REFERENCES state_master(id),
  state_code text,
  alpha_code text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT fk_customer_code FOREIGN KEY (customer_code) REFERENCES customer_master(customer_id)
);

ALTER TABLE customer_gst_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customer GST records"
  ON customer_gst_master
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create customer GST records"
  ON customer_gst_master
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customer GST records"
  ON customer_gst_master
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin users can delete customer GST records"
  ON customer_gst_master
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_customer_gst_master_customer_code ON customer_gst_master(customer_code);
CREATE INDEX IF NOT EXISTS idx_customer_gst_master_state_id ON customer_gst_master(state_id);