/*
  # Add GSTIN field to Customer GST Master

  1. Changes
    - Add `gstin` column to `customer_gst_master` table
      - Type: text
      - Nullable: true
      - Description: GSTIN number for the customer's billing address
  
  2. Notes
    - This field will store the GST Identification Number for billing purposes
    - Existing records will have NULL value for this field initially
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_gst_master' AND column_name = 'gstin'
  ) THEN
    ALTER TABLE customer_gst_master ADD COLUMN gstin text;
  END IF;
END $$;