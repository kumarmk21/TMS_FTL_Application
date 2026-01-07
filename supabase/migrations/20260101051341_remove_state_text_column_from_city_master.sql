/*
  # Remove old state text column from City Master

  1. Changes
    - Drop the old `state` text column from `city_master` table
    - We now use `state_id` foreign key instead
    
  2. Notes
    - Data has already been migrated to state_id in previous migration
    - This removes the redundant state text column that was causing NOT NULL constraint violations
*/

-- Drop the old state text column
ALTER TABLE city_master DROP COLUMN IF EXISTS state;
