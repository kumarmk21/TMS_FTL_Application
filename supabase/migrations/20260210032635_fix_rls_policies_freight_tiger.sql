/*
  # Fix RLS Policies - FreightTiger Tables
  
  Changes:
  - Use (select auth.uid()) pattern for better performance
  - Remove duplicate policies
  - Simplify policies for webhook integration
*/

DROP POLICY IF EXISTS "Admin users can view FreightTiger config" ON freight_tiger_config;
DROP POLICY IF EXISTS "Admin users can insert FreightTiger config" ON freight_tiger_config;
DROP POLICY IF EXISTS "Admin users can update FreightTiger config" ON freight_tiger_config;
DROP POLICY IF EXISTS "Admin users can manage FreightTiger config" ON freight_tiger_config;

CREATE POLICY "Admin users can manage FreightTiger config"
  ON freight_tiger_config FOR ALL
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

DROP POLICY IF EXISTS "Admin users can view all trips" ON freight_tiger_trips;
DROP POLICY IF EXISTS "Branch users can view own branch trips" ON freight_tiger_trips;
DROP POLICY IF EXISTS "Authenticated users can insert trips" ON freight_tiger_trips;
DROP POLICY IF EXISTS "Admin users can update trips" ON freight_tiger_trips;
DROP POLICY IF EXISTS "Authenticated users can view trips" ON freight_tiger_trips;
DROP POLICY IF EXISTS "Authenticated users can update trips" ON freight_tiger_trips;

CREATE POLICY "Authenticated users can view trips"
  ON freight_tiger_trips FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert trips"
  ON freight_tiger_trips FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update trips"
  ON freight_tiger_trips FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin users can view all locations" ON vehicle_locations;
DROP POLICY IF EXISTS "Branch users can view own branch locations" ON vehicle_locations;
DROP POLICY IF EXISTS "Authenticated users can insert locations" ON vehicle_locations;
DROP POLICY IF EXISTS "Authenticated users can view locations" ON vehicle_locations;

CREATE POLICY "Authenticated users can view locations"
  ON vehicle_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert locations"
  ON vehicle_locations FOR INSERT
  TO authenticated
  WITH CHECK (true);
