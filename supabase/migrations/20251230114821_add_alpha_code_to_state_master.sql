/*
  # Add Alpha Code field to State Master

  1. Changes
    - Add `alpha_code` column to `state_master` table
      - Type: text
      - Nullable: true
      - Description: Alpha code or abbreviation for the state (e.g., "MH" for Maharashtra, "KA" for Karnataka)
  
  2. Notes
    - This field will store the standard alpha code representation for each state
    - Existing records will have NULL value for this field initially
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'state_master' AND column_name = 'alpha_code'
  ) THEN
    ALTER TABLE state_master ADD COLUMN alpha_code text;
  END IF;
END $$;