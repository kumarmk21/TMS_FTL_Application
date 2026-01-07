/*
  # Add DELETE Policy for Admins

  1. New Policies
    - Admins can delete profiles
  
  2. Security
    - Uses the existing get_user_role security definer function
    - Only authenticated users with admin role can delete profiles
    - Prevents users from deleting their own profile (safety measure)
*/

-- Policy: Admins can delete profiles (except their own)
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'admin'
    AND auth.uid() != id
  );
