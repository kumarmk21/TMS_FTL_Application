/*
  # Add Branch and City Relations to Company Master

  1. Changes
    - Add `branch_id` column as foreign key to branch_master
    - Add `city_id` column as foreign key to city_master
    - Remove `city` and `state` text columns (will use relationships instead)
    - Add indexes for better query performance

  2. Reason
    - Normalize data by using relationships instead of free text
    - City selection will auto-populate state from city_master
    - Branch selection will link company to a specific branch
*/

-- Add branch_id column with foreign key to branch_master
ALTER TABLE company_master
ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branch_master(id);

-- Add city_id column with foreign key to city_master
ALTER TABLE company_master
ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES city_master(id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_company_master_branch_id ON company_master(branch_id);
CREATE INDEX IF NOT EXISTS idx_company_master_city_id ON company_master(city_id);
