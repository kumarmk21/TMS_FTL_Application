/*
  # Add state_id to City Master

  1. Changes
    - Add `state_id` column to `city_master` table as a foreign key reference to `state_master`
    - Make `state_id` mandatory (NOT NULL) after data migration
    - Keep the existing `state` text column temporarily for data migration
    
  2. Data Migration
    - Update existing records to set state_id based on state name match
    
  3. Security
    - No RLS changes needed (table already has RLS enabled)
*/

-- Add state_id column as nullable first (for data migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_master' AND column_name = 'state_id'
  ) THEN
    ALTER TABLE city_master ADD COLUMN state_id uuid REFERENCES state_master(id);
  END IF;
END $$;

-- Migrate existing data: match state text to state_master records
UPDATE city_master
SET state_id = state_master.id
FROM state_master
WHERE city_master.state_id IS NULL
  AND UPPER(TRIM(city_master.state)) = UPPER(TRIM(state_master.state_name));

-- Make state_id NOT NULL after migration
ALTER TABLE city_master ALTER COLUMN state_id SET NOT NULL;
