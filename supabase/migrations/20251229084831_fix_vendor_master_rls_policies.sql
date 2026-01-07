/*
  # Fix Vendor Master RLS Policies

  1. Changes
    - Replace JWT-based policies with direct profile table checks
    - More reliable and doesn't depend on JWT metadata sync
    
  2. Security
    - Maintains same security rules: only admins can insert/update/delete
    - All authenticated users can view vendors
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can insert vendors" ON vendor_master;
DROP POLICY IF EXISTS "Admins can update vendors" ON vendor_master;
DROP POLICY IF EXISTS "Admins can delete vendors" ON vendor_master;

-- Create new policies that check profiles table directly
CREATE POLICY "Admins can insert vendors"
  ON vendor_master
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update vendors"
  ON vendor_master
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

CREATE POLICY "Admins can delete vendors"
  ON vendor_master
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
