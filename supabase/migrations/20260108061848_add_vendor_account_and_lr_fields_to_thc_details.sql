/*
  # Add Vendor Account and LR Fields to THC Details Table

  1. Changes
    - Add vendor account information fields to `thc_details` table:
      - `ven_act_name` (text) - Vendor Account Name
      - `ven_act_number` (text) - Vendor Account Number
      - `ven_act_ifsc` (text) - Vendor Account IFSC Code
      - `ven_act_bank` (text) - Vendor Account Bank Name
      - `ven_act_branch` (text) - Vendor Account Branch Name
      - `lr_number` (text) - LR Number reference
    
  2. Purpose
    - Store vendor banking details directly in THC records for payment processing
    - Link THC details to LR number for easier reference and tracking
    - Facilitate direct payment processing without additional lookups
  
  3. Notes
    - These fields are optional and can be populated from vendor master or entered manually
    - The lr_number field provides a text reference to the LR for reporting purposes
*/

-- Add vendor account fields to thc_details table
DO $$
BEGIN
  -- Add Vendor Account Name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thc_details' AND column_name = 'ven_act_name'
  ) THEN
    ALTER TABLE thc_details ADD COLUMN ven_act_name text;
  END IF;

  -- Add Vendor Account Number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thc_details' AND column_name = 'ven_act_number'
  ) THEN
    ALTER TABLE thc_details ADD COLUMN ven_act_number text;
  END IF;

  -- Add Vendor Account IFSC
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thc_details' AND column_name = 'ven_act_ifsc'
  ) THEN
    ALTER TABLE thc_details ADD COLUMN ven_act_ifsc text;
  END IF;

  -- Add Vendor Account Bank
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thc_details' AND column_name = 'ven_act_bank'
  ) THEN
    ALTER TABLE thc_details ADD COLUMN ven_act_bank text;
  END IF;

  -- Add Vendor Account Branch
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thc_details' AND column_name = 'ven_act_branch'
  ) THEN
    ALTER TABLE thc_details ADD COLUMN ven_act_branch text;
  END IF;

  -- Add LR Number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thc_details' AND column_name = 'lr_number'
  ) THEN
    ALTER TABLE thc_details ADD COLUMN lr_number text;
  END IF;
END $$;