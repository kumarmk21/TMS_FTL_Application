/*
  # Update vendor_master tds_rate check constraint

  ## Changes
  - Drops the existing `vendor_master_tds_rate_check` constraint
  - Re-creates it to also allow the value 10 (for Individual 10% category)

  ## Allowed values after migration
  - 1 (Individual)
  - 2 (Corporate)
  - 10 (Individual 10%)
  - NULL
*/

ALTER TABLE vendor_master DROP CONSTRAINT IF EXISTS vendor_master_tds_rate_check;

ALTER TABLE vendor_master
  ADD CONSTRAINT vendor_master_tds_rate_check
  CHECK (tds_rate IN (1, 2, 10) OR tds_rate IS NULL);
