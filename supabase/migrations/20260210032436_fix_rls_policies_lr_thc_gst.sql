/*
  # Fix RLS Policies - LR Bill, THC Details, Customer GST Master
  
  Changes:
  - Use (select auth.uid()) pattern for better performance
  - Remove always-true policies that bypass security
*/

DROP POLICY IF EXISTS "Authenticated users can create LR bills" ON lr_bill;
DROP POLICY IF EXISTS "Users can update LR bills" ON lr_bill;
DROP POLICY IF EXISTS "Authenticated users can update LR bills" ON lr_bill;

CREATE POLICY "Authenticated users can create LR bills"
  ON lr_bill FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Authenticated users can update LR bills"
  ON lr_bill FOR UPDATE
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

DROP POLICY IF EXISTS "Authenticated users can create THC details" ON thc_details;
DROP POLICY IF EXISTS "Users can update THC details" ON thc_details;
DROP POLICY IF EXISTS "Authenticated users can update THC details" ON thc_details;

CREATE POLICY "Authenticated users can create THC details"
  ON thc_details FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Authenticated users can update THC details"
  ON thc_details FOR UPDATE
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

DROP POLICY IF EXISTS "Authenticated users can create customer GST records" ON customer_gst_master;
DROP POLICY IF EXISTS "Users can update customer GST records" ON customer_gst_master;
DROP POLICY IF EXISTS "Authenticated users can update customer GST records" ON customer_gst_master;

CREATE POLICY "Authenticated users can create customer GST records"
  ON customer_gst_master FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Authenticated users can update customer GST records"
  ON customer_gst_master FOR UPDATE
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
