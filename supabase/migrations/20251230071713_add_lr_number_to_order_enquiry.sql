/*
  # Add LR Number to Order Enquiry Table

  1. Changes
    - Add `lr_number` field to order_enquiry table to store the associated LR number
    - This creates a bidirectional link between order_enquiry and booking_lr tables
    - The lr_number is nullable as not all enquiries will have an LR generated

  2. Notes
    - When an LR is created from an enquiry, the lr_number will be updated in the enquiry record
    - This allows tracking which LR was generated for a specific enquiry
*/

-- Add lr_number column to order_enquiry table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_enquiry' AND column_name = 'lr_number'
  ) THEN
    ALTER TABLE order_enquiry ADD COLUMN lr_number text;
  END IF;
END $$;

-- Create index for lr_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_order_enquiry_lr_number ON order_enquiry(lr_number);