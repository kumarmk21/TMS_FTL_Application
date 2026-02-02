/*
  # Add Service Type and GST Charge Type to Warehouse Bill

  1. Changes
    - Add `service_type` column to warehouse_bill table
    - Add `gst_charge_type` column to warehouse_bill table
  
  2. Purpose
    - Store service type from customer rate master
    - Store GST charge type (IGST, CGST+SGST, Out of GST Scope) from customer rate master
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warehouse_bill' AND column_name = 'service_type'
  ) THEN
    ALTER TABLE warehouse_bill ADD COLUMN service_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warehouse_bill' AND column_name = 'gst_charge_type'
  ) THEN
    ALTER TABLE warehouse_bill ADD COLUMN gst_charge_type text;
  END IF;
END $$;