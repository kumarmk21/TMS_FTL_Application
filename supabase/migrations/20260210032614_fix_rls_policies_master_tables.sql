/*
  # Fix RLS Policies - Master Tables
  
  Changes:
  - Use (select auth.uid()) pattern for better performance
  - Remove duplicate policies
  - Remove always-true policies
*/

DROP POLICY IF EXISTS "Admin users can insert customer data" ON customer_master;
DROP POLICY IF EXISTS "Authenticated users can create customers" ON customer_master;
DROP POLICY IF EXISTS "Admin users can update customer data" ON customer_master;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON customer_master;
DROP POLICY IF EXISTS "Admin users can delete customer data" ON customer_master;
DROP POLICY IF EXISTS "Admin users can delete customers" ON customer_master;

CREATE POLICY "Authenticated users can create customers"
  ON customer_master FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Authenticated users can update customers"
  ON customer_master FOR UPDATE
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

CREATE POLICY "Admin users can delete customers"
  ON customer_master FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin users can insert branches" ON branch_master;
DROP POLICY IF EXISTS "Authenticated users can create branches" ON branch_master;
DROP POLICY IF EXISTS "Admin users can update branches" ON branch_master;
DROP POLICY IF EXISTS "Authenticated users can update branches" ON branch_master;

CREATE POLICY "Authenticated users can create branches"
  ON branch_master FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can update branches"
  ON branch_master FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin users can delete cities" ON city_master;
DROP POLICY IF EXISTS "Admin users can delete city data" ON city_master;
DROP POLICY IF EXISTS "Admin users can insert city data" ON city_master;
DROP POLICY IF EXISTS "Authenticated users can create cities" ON city_master;
DROP POLICY IF EXISTS "Admin users can update city data" ON city_master;
DROP POLICY IF EXISTS "Authenticated users can update cities" ON city_master;

CREATE POLICY "Authenticated users can create cities"
  ON city_master FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can update cities"
  ON city_master FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete cities"
  ON city_master FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin users can delete vehicle data" ON vehicle_master;
DROP POLICY IF EXISTS "Admin users can delete vehicles" ON vehicle_master;
DROP POLICY IF EXISTS "Admin users can insert vehicle data" ON vehicle_master;
DROP POLICY IF EXISTS "Authenticated users can create vehicles" ON vehicle_master;
DROP POLICY IF EXISTS "Admin users can update vehicle data" ON vehicle_master;
DROP POLICY IF EXISTS "Authenticated users can update vehicles" ON vehicle_master;

CREATE POLICY "Authenticated users can create vehicles"
  ON vehicle_master FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can update vehicles"
  ON vehicle_master FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete vehicles"
  ON vehicle_master FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );
