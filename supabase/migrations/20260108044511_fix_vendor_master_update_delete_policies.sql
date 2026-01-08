/*
  # Fix Vendor Master RLS Policies for Update and Delete
  
  1. Changes
    - Replace JWT-based role checks with direct profiles table checks
    - Ensures consistency across all vendor_master operations
    
  2. Security
    - Only users with admin role in profiles table can update/delete vendors
    - More reliable than JWT-based checks
*/

DROP POLICY IF EXISTS "Admins can update vendors" ON public.vendor_master;
DROP POLICY IF EXISTS "Admins can delete vendors" ON public.vendor_master;

CREATE POLICY "Admins can update vendors"
  ON public.vendor_master
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete vendors"
  ON public.vendor_master
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
