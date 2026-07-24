/*
# Add Zoho Books Sync Columns to THC Details

## Purpose
THC (Truck Hire Challan) records represent Purchases that will eventually be pushed
to Zoho Books. This migration adds three columns to the `thc_details` table to
track the Zoho Books sync status of each THC record, future-proofing the schema
for the planned Zoho Books Purchases integration.

## Changes
1. New Columns on `thc_details`:
   - `zoho_books_id` (text, nullable) — stores the Zoho Books purchase/bill ID
     once the THC is successfully pushed. NULL means not yet pushed.
   - `zoho_sync_status` (text, NOT NULL, default 'not_synced') — tracks the sync
     state. Allowed values: 'not_synced', 'synced', 'failed'.
   - `zoho_synced_at` (timestamptz, nullable) — timestamp of the last successful
     sync to Zoho Books.

2. Constraint:
   - A CHECK constraint `thc_zoho_sync_status_check` enforces that
     `zoho_sync_status` is one of 'not_synced', 'synced', 'failed'.

3. Index:
   - An index on `zoho_sync_status` to support filtering by sync status in the
     listing views.

4. Security:
   - No RLS policy changes. The existing authenticated CRUD policies on
     `thc_details` already cover the new columns (they are column-agnostic).

## Notes
- All existing THC records default to `zoho_sync_status = 'not_synced'`.
- No data is lost; this is a purely additive migration.
*/

-- Add zoho_books_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thc_details' AND column_name = 'zoho_books_id'
  ) THEN
    ALTER TABLE thc_details ADD COLUMN zoho_books_id text;
  END IF;
END $$;

-- Add zoho_sync_status column with default
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thc_details' AND column_name = 'zoho_sync_status'
  ) THEN
    ALTER TABLE thc_details
      ADD COLUMN zoho_sync_status text NOT NULL DEFAULT 'not_synced';
  END IF;
END $$;

-- Add zoho_synced_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thc_details' AND column_name = 'zoho_synced_at'
  ) THEN
    ALTER TABLE thc_details ADD COLUMN zoho_synced_at timestamptz;
  END IF;
END $$;

-- Add CHECK constraint for zoho_sync_status allowed values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'thc_zoho_sync_status_check'
  ) THEN
    ALTER TABLE thc_details
      ADD CONSTRAINT thc_zoho_sync_status_check
      CHECK (zoho_sync_status IN ('not_synced', 'synced', 'failed'));
  END IF;
END $$;

-- Backfill existing rows so the default is materialized
UPDATE thc_details SET zoho_sync_status = 'not_synced' WHERE zoho_sync_status IS NULL;

-- Add index for filtering by sync status
CREATE INDEX IF NOT EXISTS idx_thc_details_zoho_sync_status
  ON thc_details (zoho_sync_status);
