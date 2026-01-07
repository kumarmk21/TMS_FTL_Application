/*
  # Create Storage Bucket for Vendor Documents

  1. Storage
    - Create `vendor-documents` bucket for storing vendor files
    - PAN documents
    - Cancelled cheques
    - TDS declarations

  2. Security
    - Authenticated users can read files
    - Only admins can upload and delete files
*/

-- Create storage bucket for vendor documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-documents', 'vendor-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to read vendor documents
CREATE POLICY "Authenticated users can read vendor documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'vendor-documents');

-- Policy: Allow admins to upload vendor documents
CREATE POLICY "Admins can upload vendor documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vendor-documents'
    AND (auth.jwt()->>'role')::text = 'admin'
  );

-- Policy: Allow admins to update vendor documents
CREATE POLICY "Admins can update vendor documents"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'vendor-documents'
    AND (auth.jwt()->>'role')::text = 'admin'
  );

-- Policy: Allow admins to delete vendor documents
CREATE POLICY "Admins can delete vendor documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vendor-documents'
    AND (auth.jwt()->>'role')::text = 'admin'
  );