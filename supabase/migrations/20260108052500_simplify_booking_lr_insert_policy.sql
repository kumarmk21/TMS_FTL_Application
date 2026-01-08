/*
  # Simplify booking_lr INSERT policy
  
  1. Changes
    - Replace booking_lr INSERT policy with simpler version
    - Allow all authenticated users to insert without restrictions
    
  2. Security
    - Still requires authentication
    - Allows record creation without checking created_by field
*/

-- Drop existing INSERT policy for booking_lr
DROP POLICY IF EXISTS "Authenticated users can create booking LRs" ON public.booking_lr;

-- Create simplified INSERT policy
CREATE POLICY "Authenticated users can create booking LRs"
  ON public.booking_lr FOR INSERT TO authenticated
  WITH CHECK (true);
