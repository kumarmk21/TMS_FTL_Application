/*
  # Add 'Cancelled' to consol_bill_status check constraint

  The existing check constraint on consol_bill_data.consol_bill_status did not
  include 'Cancelled' as a valid value, causing the cancel action to fail.

  Changes:
  - Drop the existing consol_bill_status_check constraint
  - Re-create it with 'Cancelled' added to the allowed values
*/

ALTER TABLE consol_bill_data
  DROP CONSTRAINT IF EXISTS consol_bill_data_consol_bill_status_check;

ALTER TABLE consol_bill_data
  ADD CONSTRAINT consol_bill_data_consol_bill_status_check
  CHECK (consol_bill_status = ANY (ARRAY[
    'Cons.Generated',
    'Submitted',
    'Partially Paid',
    'Fully Paid',
    'Disputed',
    'Cancelled'
  ]));
