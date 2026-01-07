/*
  # Add Order Confirmation and Cancellation Fields

  1. New Columns
    - `vendor_id` (uuid, foreign key to vendor_master, nullable)
      - Selected vendor when order is confirmed
    - `vehicle_number` (text, nullable)
      - Vehicle registration number for confirmed orders
    - `driver_number` (text, nullable)
      - Driver contact number (10 digits) for confirmed orders
    - `truck_hire` (numeric, nullable)
      - Truck hire amount for confirmed orders
    - `cancellation_reason` (text, nullable)
      - Reason when order is cancelled
    - `updated_at` (timestamptz, default now())
      - Track when record was last updated
    - `updated_by` (uuid, foreign key to profiles, nullable)
      - Track who last updated the record

  2. Security Updates
    - Allow users to update their own enquiries
    - Allow admins to update all enquiries

  3. Constraints
    - Driver number must be exactly 10 digits when provided
    - Truck hire must be positive when provided
*/

-- Add new columns to order_enquiry table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_enquiry' AND column_name = 'vendor_id'
  ) THEN
    ALTER TABLE order_enquiry ADD COLUMN vendor_id uuid REFERENCES vendor_master(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_enquiry' AND column_name = 'vehicle_number'
  ) THEN
    ALTER TABLE order_enquiry ADD COLUMN vehicle_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_enquiry' AND column_name = 'driver_number'
  ) THEN
    ALTER TABLE order_enquiry ADD COLUMN driver_number text
      CHECK (driver_number IS NULL OR driver_number ~ '^[0-9]{10}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_enquiry' AND column_name = 'truck_hire'
  ) THEN
    ALTER TABLE order_enquiry ADD COLUMN truck_hire numeric
      CHECK (truck_hire IS NULL OR truck_hire > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_enquiry' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE order_enquiry ADD COLUMN cancellation_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_enquiry' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE order_enquiry ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_enquiry' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE order_enquiry ADD COLUMN updated_by uuid REFERENCES profiles(id);
  END IF;
END $$;

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_order_enquiry_updated_at ON order_enquiry;
CREATE TRIGGER update_order_enquiry_updated_at
  BEFORE UPDATE ON order_enquiry
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Drop old update policy and create new ones
DROP POLICY IF EXISTS "Admins can update enquiries" ON order_enquiry;

-- Policy: Users can update their own enquiries
CREATE POLICY "Users can update own enquiries"
  ON order_enquiry
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Policy: Admins can update all enquiries
CREATE POLICY "Admins can update all enquiries"
  ON order_enquiry
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

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_order_enquiry_vendor_id ON order_enquiry(vendor_id);
CREATE INDEX IF NOT EXISTS idx_order_enquiry_updated_at ON order_enquiry(updated_at);
