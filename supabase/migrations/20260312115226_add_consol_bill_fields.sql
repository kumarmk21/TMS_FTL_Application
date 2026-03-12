/*
  # Add Consol Bill Fields
  
  ## Changes
  1. Add consol bill fields to booking_lr table:
    - consol_bill_number (auto-generated with format CL"YY"000001)
    - consol_bill_date
  
  2. Add consol bill fields to lr_bill table:
    - consol_bill_number (auto-generated with format CL"YY"000001)
    - consol_bill_date
    - consol_bill_sub_date
    - consol_bill_sub_to
    - consol_bill_ack (file path reference)
  
  3. Create storage bucket for consol bill acknowledgments
  
  4. Create function to generate consol bill numbers
  
  ## Security
  - RLS policies will inherit from existing table policies
  - Storage bucket has appropriate access controls
*/

-- Add fields to booking_lr table
ALTER TABLE booking_lr 
  ADD COLUMN IF NOT EXISTS consol_bill_number text,
  ADD COLUMN IF NOT EXISTS consol_bill_date date;

-- Add fields to lr_bill table
ALTER TABLE lr_bill 
  ADD COLUMN IF NOT EXISTS consol_bill_number text,
  ADD COLUMN IF NOT EXISTS consol_bill_date date,
  ADD COLUMN IF NOT EXISTS consol_bill_sub_date date,
  ADD COLUMN IF NOT EXISTS consol_bill_sub_to text,
  ADD COLUMN IF NOT EXISTS consol_bill_ack text;

-- Create storage bucket for consol bill acknowledgments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'consol-bill-acks',
  'consol-bill-acks',
  false,
  5242880,
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for consol bill acknowledgments
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Authenticated users can upload consol bill acks" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can view consol bill acks" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete consol bill acks" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Authenticated users can upload consol bill acks"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'consol-bill-acks' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Authenticated users can view consol bill acks"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'consol-bill-acks' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Authenticated users can delete consol bill acks"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'consol-bill-acks' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

-- Create function to generate consol bill number
CREATE OR REPLACE FUNCTION generate_consol_bill_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year text;
  next_number int;
  new_consol_bill_number text;
BEGIN
  -- Get current year in YY format
  current_year := TO_CHAR(CURRENT_DATE, 'YY');
  
  -- Get the highest consol bill number for current year from both tables
  WITH combined_numbers AS (
    SELECT consol_bill_number FROM booking_lr WHERE consol_bill_number IS NOT NULL
    UNION ALL
    SELECT consol_bill_number FROM lr_bill WHERE consol_bill_number IS NOT NULL
  )
  SELECT COALESCE(MAX(
    CASE 
      WHEN consol_bill_number ~ ('^CL' || current_year || '[0-9]{6}$')
      THEN CAST(SUBSTRING(consol_bill_number FROM 5) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM combined_numbers;
  
  -- Generate new consol bill number with format CL"YY"000001
  new_consol_bill_number := 'CL' || current_year || LPAD(next_number::text, 6, '0');
  
  RETURN new_consol_bill_number;
END;
$$;

-- Create trigger function to auto-populate consol bill number for booking_lr
CREATE OR REPLACE FUNCTION auto_populate_consol_bill_number_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only generate if consol_bill_number is not provided and consol_bill_date is set
  IF NEW.consol_bill_number IS NULL AND NEW.consol_bill_date IS NOT NULL THEN
    NEW.consol_bill_number := generate_consol_bill_number();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger function to auto-populate consol bill number for lr_bill
CREATE OR REPLACE FUNCTION auto_populate_consol_bill_number_lr_bill()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only generate if consol_bill_number is not provided and consol_bill_date is set
  IF NEW.consol_bill_number IS NULL AND NEW.consol_bill_date IS NOT NULL THEN
    NEW.consol_bill_number := generate_consol_bill_number();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS auto_populate_consol_bill_number_booking_trigger ON booking_lr;
DROP TRIGGER IF EXISTS auto_populate_consol_bill_number_lr_bill_trigger ON lr_bill;

-- Create triggers
CREATE TRIGGER auto_populate_consol_bill_number_booking_trigger
  BEFORE INSERT OR UPDATE ON booking_lr
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_consol_bill_number_booking();

CREATE TRIGGER auto_populate_consol_bill_number_lr_bill_trigger
  BEFORE INSERT OR UPDATE ON lr_bill
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_consol_bill_number_lr_bill();
