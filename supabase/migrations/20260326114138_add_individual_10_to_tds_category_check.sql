/*
  # Update vendor_master tds_category check constraint

  ## Changes
  - Drops the existing `vendor_master_tds_category_check` constraint
  - Re-creates it to also allow the new value 'Individual 10%'

  ## Allowed values after migration
  - Individual
  - Corporate
  - Individual 10%
  - NULL
*/

ALTER TABLE vendor_master DROP CONSTRAINT IF EXISTS vendor_master_tds_category_check;

ALTER TABLE vendor_master
  ADD CONSTRAINT vendor_master_tds_category_check
  CHECK (tds_category IN ('Individual', 'Corporate', 'Individual 10%') OR tds_category IS NULL);
