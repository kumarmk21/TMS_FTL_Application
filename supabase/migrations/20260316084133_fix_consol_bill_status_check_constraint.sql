/*
  # Fix consol_bill_status check constraint

  ## Problem
  The existing CHECK constraint on consol_bill_data.consol_bill_status does not
  include 'Cons.Generated', which is the default status sent by the UI when
  generating a consolidation bill. This causes the INSERT to fail with a
  constraint violation error.

  ## Changes
  - Drops the old check constraint
  - Re-creates it with the correct allowed values that match the UI options:
    'Cons.Generated', 'Submitted', 'Partially Paid', 'Fully Paid', 'Disputed'
  - Also updates the column default from 'Draft' to 'Cons.Generated'
*/

ALTER TABLE consol_bill_data
  DROP CONSTRAINT IF EXISTS consol_bill_data_consol_bill_status_check;

ALTER TABLE consol_bill_data
  ADD CONSTRAINT consol_bill_data_consol_bill_status_check
  CHECK (consol_bill_status = ANY (ARRAY[
    'Cons.Generated'::text,
    'Submitted'::text,
    'Partially Paid'::text,
    'Fully Paid'::text,
    'Disputed'::text
  ]));

ALTER TABLE consol_bill_data
  ALTER COLUMN consol_bill_status SET DEFAULT 'Cons.Generated';
