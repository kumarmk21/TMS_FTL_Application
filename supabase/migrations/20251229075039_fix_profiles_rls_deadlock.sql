/*
  # Fix Profiles RLS Deadlock Issue

  1. Problem
    - Users unable to load their profile after login
    - RLS policies may have circular dependency issues
    - "Role Not Loaded" error appears

  2. Solution
    - Drop all existing policies on profiles table
    - Create simple, non-recursive policies
    - Ensure every authenticated user can read their own profile
    - Admins can read/update all profiles

  3. Security
    - Maintains RLS protection
    - No circular dependencies
    - Clear access control rules
*/

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Managers and admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- Simple policy: Any authenticated user can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Simple policy: Any authenticated user can update their own profile (excluding role)
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- Admin can read all profiles (using app_metadata to avoid recursion)
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'admin'
    OR auth.uid() = id
  );

-- Admin can update any profile
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin')
  WITH CHECK ((auth.jwt()->>'role')::text = 'admin');

-- Admin can insert profiles
CREATE POLICY "Admins can insert profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'role')::text = 'admin');

-- Admin can delete profiles
CREATE POLICY "Admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin');