/*
  # Add THC Status Fields to THC Details Table

  1. Changes
    - Add operational and financial status tracking to `thc_details` table:
      - `thc_status_ops` (uuid) - Operations Status (Foreign key to status_master)
      - `thc_status_fin` (uuid) - Finance Status (Foreign key to status_master)
    
  2. Purpose
    - Track THC operational status (e.g., Open, In Progress, Completed)
    - Track THC financial status (e.g., ATH Paid, Balance Pending, Fully Paid)
    - Enable status-based filtering and reporting for THC management
    - Separate operational and financial workflows with distinct status tracking
  
  3. Default Values
    - When THC is generated during Truck Dispatch:
      - `thc_status_ops` defaults to 'Open' (status_type='THC')
      - `thc_status_fin` defaults to 'ATH Paid' (status_type='THC')
  
  4. Notes
    - Both fields are optional to allow for historical data
    - Foreign key constraints ensure referential integrity with status_master
    - Indexes added for performance on status-based queries
*/

-- Add THC Status Operations field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thc_details' AND column_name = 'thc_status_ops'
  ) THEN
    ALTER TABLE thc_details ADD COLUMN thc_status_ops uuid REFERENCES status_master(id);
    CREATE INDEX IF NOT EXISTS idx_thc_details_status_ops ON thc_details(thc_status_ops);
  END IF;
END $$;

-- Add THC Status Finance field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thc_details' AND column_name = 'thc_status_fin'
  ) THEN
    ALTER TABLE thc_details ADD COLUMN thc_status_fin uuid REFERENCES status_master(id);
    CREATE INDEX IF NOT EXISTS idx_thc_details_status_fin ON thc_details(thc_status_fin);
  END IF;
END $$;