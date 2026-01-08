/*
  # Enhance LR Entry Fields
  
  1. Changes
    - Add enquiry_date field to booking_lr table
    - Change entry_date to timestamp (entry_datetime)
    - Add to_city field to booking_lr table
    - These fields will support better tracking and reporting
    
  2. Notes
    - enquiry_date will be auto-populated from order_enquiry when selected
    - entry_datetime will store full timestamp for audit trail
    - to_city will store destination city name for quick reference
*/

-- Add new columns to booking_lr table
DO $$
BEGIN
  -- Add enquiry_date if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'booking_lr' AND column_name = 'enquiry_date'
  ) THEN
    ALTER TABLE public.booking_lr
    ADD COLUMN enquiry_date date;
  END IF;

  -- Add to_city if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'booking_lr' AND column_name = 'to_city'
  ) THEN
    ALTER TABLE public.booking_lr
    ADD COLUMN to_city text;
  END IF;
END $$;
