/*
  # Add GST Rate and RCM Applicable fields to sac_code_master

  ## Changes
  - New Columns Added to `sac_code_master`:
    - `gst_rate` (numeric, 5,2): GST Rate percentage (e.g., 18.00). Mandatory field.
    - `rcm_applicable` (boolean): Whether Reverse Charge Mechanism is applicable. Default false.

  ## Notes
  - Both columns use safe IF NOT EXISTS pattern to avoid errors on re-run.
  - `gst_rate` defaults to 0 to avoid null constraint issues on existing rows.
  - `rcm_applicable` defaults to false.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sac_code_master' AND column_name = 'gst_rate'
  ) THEN
    ALTER TABLE sac_code_master ADD COLUMN gst_rate numeric(5,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sac_code_master' AND column_name = 'rcm_applicable'
  ) THEN
    ALTER TABLE sac_code_master ADD COLUMN rcm_applicable boolean NOT NULL DEFAULT false;
  END IF;
END $$;
