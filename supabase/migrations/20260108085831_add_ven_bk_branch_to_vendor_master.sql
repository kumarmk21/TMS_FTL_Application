/*
  # Add Vendor Booking Branch to Vendor Master

  1. Changes
    - Add `ven_bk_branch` field to `vendor_master` table
      - `ven_bk_branch` (text) - Vendor Booking Branch Code
    
  2. Purpose
    - Store the booking branch associated with each vendor
    - Enables branch-based vendor filtering and reporting
    - Links vendors to specific branch operations
  
  3. Notes
    - Field is optional to maintain backward compatibility
    - Can be used to restrict vendor access based on branch
*/

-- Add ven_bk_branch field to vendor_master table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_master' AND column_name = 'ven_bk_branch'
  ) THEN
    ALTER TABLE vendor_master ADD COLUMN ven_bk_branch text;
  END IF;
END $$;

-- Create index on ven_bk_branch for branch-based filtering
CREATE INDEX IF NOT EXISTS idx_vendor_master_ven_bk_branch ON vendor_master(ven_bk_branch);