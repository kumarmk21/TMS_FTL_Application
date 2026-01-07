/*
  # Fix RLS Performance and Security Issues

  ## Changes Made
  
  1. **RLS Performance Optimization**
     - Updated all RLS policies to use `(select auth.uid())` instead of `auth.uid()`
     - This prevents function re-evaluation for each row, improving query performance at scale
     - Affects policies on: profiles, branch_master, city_master, vehicle_master, customer_master
  
  2. **Remove Unused Indexes**
     - Dropped indexes that have not been used
     - Reduces storage overhead and improves write performance
  
  3. **Remove Duplicate Indexes**
     - Consolidated duplicate indexes on customer_master and vehicle_master tables
     - Keeps the constraint-based indexes
  
  4. **Fix Function Security**
     - Added explicit search_path to all functions to prevent search path manipulation attacks
  
  ## Security Impact
  - Improved query performance for RLS policies
  - Reduced attack surface by fixing function search paths
  - Cleaner index structure for better maintenance
*/

-- =====================================================
-- 1. DROP AND RECREATE PROFILES TABLE RLS POLICIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Managers and admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- Recreate with optimized auth function calls
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Managers and admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- =====================================================
-- 2. DROP AND RECREATE BRANCH_MASTER RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view branch data" ON branch_master;
DROP POLICY IF EXISTS "Admin users can insert branches" ON branch_master;
DROP POLICY IF EXISTS "Admin users can update branches" ON branch_master;
DROP POLICY IF EXISTS "Admin users can delete branches" ON branch_master;

CREATE POLICY "Authenticated users can view branch data"
  ON branch_master FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can insert branches"
  ON branch_master FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can update branches"
  ON branch_master FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete branches"
  ON branch_master FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- =====================================================
-- 3. DROP AND RECREATE CITY_MASTER RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view city data" ON city_master;
DROP POLICY IF EXISTS "Admin users can insert city data" ON city_master;
DROP POLICY IF EXISTS "Admin users can update city data" ON city_master;
DROP POLICY IF EXISTS "Admin users can delete city data" ON city_master;

CREATE POLICY "Authenticated users can view city data"
  ON city_master FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can insert city data"
  ON city_master FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can update city data"
  ON city_master FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete city data"
  ON city_master FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- =====================================================
-- 4. DROP AND RECREATE VEHICLE_MASTER RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view vehicle data" ON vehicle_master;
DROP POLICY IF EXISTS "Admin users can insert vehicle data" ON vehicle_master;
DROP POLICY IF EXISTS "Admin users can update vehicle data" ON vehicle_master;
DROP POLICY IF EXISTS "Admin users can delete vehicle data" ON vehicle_master;

CREATE POLICY "Authenticated users can view vehicle data"
  ON vehicle_master FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can insert vehicle data"
  ON vehicle_master FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can update vehicle data"
  ON vehicle_master FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete vehicle data"
  ON vehicle_master FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- =====================================================
-- 5. DROP AND RECREATE CUSTOMER_MASTER RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view customer data" ON customer_master;
DROP POLICY IF EXISTS "Admin users can insert customer data" ON customer_master;
DROP POLICY IF EXISTS "Admin users can update customer data" ON customer_master;
DROP POLICY IF EXISTS "Admin users can delete customer data" ON customer_master;

CREATE POLICY "Authenticated users can view customer data"
  ON customer_master FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can insert customer data"
  ON customer_master FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can update customer data"
  ON customer_master FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete customer data"
  ON customer_master FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- =====================================================
-- 6. DROP UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_profiles_branch_code;
DROP INDEX IF EXISTS idx_city_master_state;
DROP INDEX IF EXISTS idx_vehicle_master_active;
DROP INDEX IF EXISTS idx_customer_master_name;
DROP INDEX IF EXISTS idx_customer_master_active;
DROP INDEX IF EXISTS idx_customer_master_group_id;
DROP INDEX IF EXISTS idx_customer_master_city;
DROP INDEX IF EXISTS idx_customer_master_state;

-- =====================================================
-- 7. DROP DUPLICATE INDEXES (Keep constraint indexes)
-- =====================================================

-- For customer_master, keep customer_master_customer_id_key (constraint), drop idx
DROP INDEX IF EXISTS idx_customer_master_customer_id;

-- For vehicle_master, keep vehicle_master_vehicle_code_key (constraint), drop idx
DROP INDEX IF EXISTS idx_vehicle_master_code;

-- =====================================================
-- 8. FIX FUNCTION SECURITY - Add Explicit Search Paths
-- =====================================================

-- Fix update_branch_master_updated_at function
CREATE OR REPLACE FUNCTION update_branch_master_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, branch_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NEW.raw_user_meta_data->>'branch_code'
  );
  RETURN NEW;
END;
$$;

-- Fix handle_updated_at function
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix get_user_role function
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'user');
END;
$$;
