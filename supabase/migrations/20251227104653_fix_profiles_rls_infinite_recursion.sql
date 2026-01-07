/*
  # Fix Infinite Recursion in Profiles RLS Policies

  ## Problem
  The existing RLS policies on the profiles table were causing infinite recursion
  because they were querying the profiles table from within the profiles table policies.

  ## Solution
  1. Drop all existing policies on profiles table
  2. Create a security definer function to check user roles (bypasses RLS)
  3. Create new simplified policies using the security definer function
  
  ## New Policies
  - Users can view their own profile
  - Managers and admins can view all profiles (using security definer function)
  - Users can update their own profile (but not their role)
  - Admins can update any profile (using security definer function)
  - Admins can insert new profiles (using security definer function)

  ## Security Notes
  - Security definer functions bypass RLS, so they must be carefully designed
  - The get_user_role function only returns the role, minimizing security risk
  - All policies still require authentication
*/

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Managers and admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

-- Create security definer function to get user role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Managers and admins can view all profiles
CREATE POLICY "Managers and admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('manager', 'admin')
  );

-- Policy: Users can update their own profile (but cannot change their role)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = public.get_user_role(auth.uid())
  );

-- Policy: Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'admin'
  );

-- Policy: Admins can insert new profiles
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role(auth.uid()) = 'admin'
  );
