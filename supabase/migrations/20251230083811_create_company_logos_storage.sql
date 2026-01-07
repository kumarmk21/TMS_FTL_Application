/*
  # Create Company Logos Storage Bucket

  1. Storage
    - Create `company-logos` bucket for storing company logo images
    - Set bucket to public for easy access to logos
    - Allow authenticated users to upload logos
    - Allow authenticated users to update their uploaded logos
    - Allow admin users to delete logos

  2. Security
    - Bucket is public (logos need to be viewable by all users)
    - Upload restricted to authenticated users
    - Delete restricted to admin users
*/

-- Create the storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload company logos
CREATE POLICY "Authenticated users can upload company logos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos' AND
    (storage.foldername(name))[1] = 'logos'
  );

-- Policy: Allow public read access to company logos
CREATE POLICY "Public can view company logos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'company-logos');

-- Policy: Allow authenticated users to update company logos
CREATE POLICY "Authenticated users can update company logos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'company-logos')
  WITH CHECK (bucket_id = 'company-logos');

-- Policy: Allow admin users to delete company logos
CREATE POLICY "Admin users can delete company logos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-logos' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
