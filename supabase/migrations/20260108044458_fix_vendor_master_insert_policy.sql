/*
  # Fix Vendor Master RLS Policy for Insert
  
  1. Changes
    - Replace JWT-based role check with direct profiles table check for INSERT
    - More reliable and works immediately without requiring re-login
    
  2. Security
    - Only users with admin role in profiles table can insert vendors
    - Maintains same security level as before
*/

DROP POLICY IF EXISTS "Admins can insert vendors" ON public.vendor_master;

CREATE POLICY "Admins can insert vendors"
  ON public.vendor_master
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
