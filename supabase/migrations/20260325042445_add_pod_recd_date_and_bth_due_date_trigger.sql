/*
  # Add POD_Recd_Date column and auto-calculate bth_due_date trigger

  ## Summary
  This migration adds a new date field for recording when POD (Proof of Delivery)
  is received, and sets up an automated trigger to calculate the BTH due date.

  ## Changes

  ### New Column: thc_details
  - `pod_recd_date` (DATE, nullable) — The date when the POD document was received.
    Used as the basis for calculating the BTH due date.

  ### New Index
  - `idx_thc_details_pod_recd_date` — Index on pod_recd_date for faster queries
    when filtering or reporting on POD received date ranges.

  ### New Function: calculate_bth_due_date()
  - PL/pgSQL function that computes bth_due_date = pod_recd_date + 45 days.
  - Handles NULL values safely: if pod_recd_date is NULL, bth_due_date is left unchanged.

  ### New Trigger: trg_auto_bth_due_date
  - Fires BEFORE INSERT OR UPDATE on thc_details.
  - Automatically sets bth_due_date whenever pod_recd_date is provided or changed.

  ## Business Rule
  bth_due_date = pod_recd_date + 45 days

  ## Notes
  - NULL pod_recd_date does NOT overwrite an existing bth_due_date value.
  - bth_due_date can still be manually set when pod_recd_date is NULL.
*/

-- Step 1: Add pod_recd_date column to thc_details
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thc_details' AND column_name = 'pod_recd_date'
  ) THEN
    ALTER TABLE thc_details ADD COLUMN pod_recd_date DATE;
  END IF;
END $$;

-- Step 2: Create index on pod_recd_date for query performance
CREATE INDEX IF NOT EXISTS idx_thc_details_pod_recd_date
  ON thc_details (pod_recd_date);

-- Step 3: Create the trigger function
CREATE OR REPLACE FUNCTION calculate_bth_due_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only calculate when pod_recd_date is provided (not null)
  IF NEW.pod_recd_date IS NOT NULL THEN
    NEW.bth_due_date := NEW.pod_recd_date + INTERVAL '45 days';
  END IF;

  RETURN NEW;
END;
$$;

-- Step 4: Drop trigger if it already exists, then recreate
DROP TRIGGER IF EXISTS trg_auto_bth_due_date ON thc_details;

CREATE TRIGGER trg_auto_bth_due_date
  BEFORE INSERT OR UPDATE OF pod_recd_date
  ON thc_details
  FOR EACH ROW
  EXECUTE FUNCTION calculate_bth_due_date();
