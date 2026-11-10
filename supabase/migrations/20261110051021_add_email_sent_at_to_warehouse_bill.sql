/*
# Track when a warehouse bill was emailed

1. Modified Tables
- `warehouse_bill`
  - `email_sent_at` (timestamptz, nullable): set to the time the bill was last successfully emailed to the billing party. Null means never emailed.

2. Security
- No new tables or policies. Existing row-level security on `warehouse_bill` is unchanged.

3. Notes
- Adding a nullable column does not affect existing rows or any current queries.
*/

ALTER TABLE warehouse_bill ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;
