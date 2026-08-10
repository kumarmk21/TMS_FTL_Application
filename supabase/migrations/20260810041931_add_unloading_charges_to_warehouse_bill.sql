/*
# Add Unloading Charges to Warehouse Bill

1. Modified Tables
- `warehouse_bill`
  - Add column `unloading_charges` (numeric, default 0) to store unloading charges.
  - Existing bills get 0 by default; no data is lost or moved.
2. Security
- No RLS policy changes. Existing policies remain in effect.
3. Important Notes
- The new column is nullable-safe with a default of 0 so existing rows and code paths continue to work.
- Sub Total calculation in the frontend will include this new column.
*/

ALTER TABLE warehouse_bill
  ADD COLUMN IF NOT EXISTS unloading_charges numeric DEFAULT 0;
