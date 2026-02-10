/*
  # Fix RLS Policies - Vendor Master
  
  Changes:
  - Use (select auth.uid()) pattern for better performance
  - Remove duplicate policies
  - Consolidate related policies
*/

DROP POLICY IF EXISTS "Authenticated users can insert vendors" ON vendor_master;
DROP POLICY IF EXISTS "Authenticated users can update vendors" ON vendor_master;
DROP POLICY IF EXISTS "Authenticated users can delete vendors" ON vendor_master;
DROP POLICY IF EXISTS "Admins can insert vendors" ON vendor_master;
DROP POLICY IF EXISTS "Admins can update vendors" ON vendor_master;
DROP POLICY IF EXISTS "Admins can delete vendors" ON vendor_master;
DROP POLICY IF EXISTS "Authenticated users can view vendors" ON vendor_master;
DROP POLICY IF EXISTS "Authenticated users can manage vendors" ON vendor_master;

CREATE POLICY "Authenticated users can view vendors"
  ON vendor_master FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage vendors"
  ON vendor_master FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );
