/*
  # Fix Vendor Master RLS Policies
  
  ## Changes
  - Replace the "FOR ALL" policy with separate INSERT, UPDATE, and DELETE policies
  - INSERT: Allow authenticated users to create vendors
  - UPDATE: Allow authenticated users to update vendors  
  - DELETE: Allow only admin users to delete vendors
  
  ## Security
  - Ensures proper separation of concerns
  - INSERT only requires WITH CHECK clause
  - UPDATE requires both USING and WITH CHECK clauses
  - DELETE only requires USING clause and admin role
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can manage vendors" ON vendor_master;
DROP POLICY IF EXISTS "Authenticated users can insert vendors" ON vendor_master;
DROP POLICY IF EXISTS "Authenticated users can update vendors" ON vendor_master;
DROP POLICY IF EXISTS "Authenticated users can delete vendors" ON vendor_master;

-- Create separate policies for each operation
CREATE POLICY "Authenticated users can insert vendors"
  ON vendor_master FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Authenticated users can update vendors"
  ON vendor_master FOR UPDATE
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

CREATE POLICY "Admin users can delete vendors"
  ON vendor_master FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );
