/*
  # Fix RLS Policies - Order Enquiry, Booking Transaction, Booking LR
  
  Changes:
  - Use (select auth.uid()) pattern for better performance
  - Remove duplicate policies
  - Remove always-true policies that bypass security
*/

DROP POLICY IF EXISTS "Authenticated users can insert enquiries" ON order_enquiry;
DROP POLICY IF EXISTS "Users can update enquiries" ON order_enquiry;
DROP POLICY IF EXISTS "Authenticated users can update enquiries" ON order_enquiry;

CREATE POLICY "Authenticated users can insert enquiries"
  ON order_enquiry FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Authenticated users can update enquiries"
  ON order_enquiry FOR UPDATE
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

DROP POLICY IF EXISTS "Users can insert booking transactions" ON booking_transaction;
DROP POLICY IF EXISTS "Users can update booking transactions" ON booking_transaction;
DROP POLICY IF EXISTS "Users can view booking transactions" ON booking_transaction;
DROP POLICY IF EXISTS "Users can view all booking transactions" ON booking_transaction;
DROP POLICY IF EXISTS "Authenticated users can view booking transactions" ON booking_transaction;
DROP POLICY IF EXISTS "Authenticated users can insert booking transactions" ON booking_transaction;
DROP POLICY IF EXISTS "Authenticated users can update booking transactions" ON booking_transaction;

CREATE POLICY "Authenticated users can view booking transactions"
  ON booking_transaction FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert booking transactions"
  ON booking_transaction FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Authenticated users can update booking transactions"
  ON booking_transaction FOR UPDATE
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

DROP POLICY IF EXISTS "Authenticated users can create booking LRs" ON booking_lr;
DROP POLICY IF EXISTS "Users can update booking LRs" ON booking_lr;
DROP POLICY IF EXISTS "Authenticated users can update booking LRs" ON booking_lr;

CREATE POLICY "Authenticated users can create booking LRs"
  ON booking_lr FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Authenticated users can update booking LRs"
  ON booking_lr FOR UPDATE
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
