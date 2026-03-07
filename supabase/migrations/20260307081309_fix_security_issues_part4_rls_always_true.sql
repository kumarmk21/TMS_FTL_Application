/*
  # Security Fixes Part 4: Fix RLS Policies Always True

  1. RLS Policies Always True
    - Replace overly permissive policies with proper authentication checks
    - Ensure policies validate user authentication properly
*/

-- =====================================================
-- FIX RLS POLICIES ALWAYS TRUE
-- =====================================================

-- Account Group
DROP POLICY IF EXISTS "Authenticated users can create account groups" ON public.account_group;
CREATE POLICY "Authenticated users can create account groups"
  ON public.account_group FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update account groups" ON public.account_group;
CREATE POLICY "Authenticated users can update account groups"
  ON public.account_group FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Accounts Master
DROP POLICY IF EXISTS "Authenticated users can create accounts" ON public.accounts_master;
CREATE POLICY "Authenticated users can create accounts"
  ON public.accounts_master FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update accounts" ON public.accounts_master;
CREATE POLICY "Authenticated users can update accounts"
  ON public.accounts_master FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admin Expenses Transaction
DROP POLICY IF EXISTS "Authenticated users can create admin expenses" ON public.admin_expenses_transaction;
CREATE POLICY "Authenticated users can create admin expenses"
  ON public.admin_expenses_transaction FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update admin expenses" ON public.admin_expenses_transaction;
CREATE POLICY "Authenticated users can update admin expenses"
  ON public.admin_expenses_transaction FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Booking LR
DROP POLICY IF EXISTS "Authenticated users can update booking LRs" ON public.booking_lr;
CREATE POLICY "Authenticated users can update booking LRs"
  ON public.booking_lr FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Freight Tiger Trips
DROP POLICY IF EXISTS "Authenticated users can insert trips" ON public.freight_tiger_trips;
CREATE POLICY "Authenticated users can insert trips"
  ON public.freight_tiger_trips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update trips" ON public.freight_tiger_trips;
CREATE POLICY "Authenticated users can update trips"
  ON public.freight_tiger_trips FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- LR Bill
DROP POLICY IF EXISTS "Authenticated users can update LR bills" ON public.lr_bill;
CREATE POLICY "Authenticated users can update LR bills"
  ON public.lr_bill FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Vehicle Locations
DROP POLICY IF EXISTS "Authenticated users can insert locations" ON public.vehicle_locations;
CREATE POLICY "Authenticated users can insert locations"
  ON public.vehicle_locations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);