/*
  # Fix LR Bill and Booking LR Update Policies

  1. Changes
    - Update RLS policies for `lr_bill` table to allow updates without restrictive with_check
    - Update RLS policies for `booking_lr` table to allow updates without restrictive with_check
    - This fixes the "Failed to cancel bill" error by allowing authenticated users to update records

  2. Security
    - Maintains authentication requirement
    - Removes overly restrictive profile existence check on updates
    - Only authenticated users can update records
*/

-- Drop and recreate lr_bill update policy
DROP POLICY IF EXISTS "Authenticated users can update LR bills" ON lr_bill;

CREATE POLICY "Authenticated users can update LR bills"
  ON lr_bill
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Drop and recreate booking_lr update policy
DROP POLICY IF EXISTS "Authenticated users can update booking LRs" ON booking_lr;

CREATE POLICY "Authenticated users can update booking LRs"
  ON booking_lr
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
