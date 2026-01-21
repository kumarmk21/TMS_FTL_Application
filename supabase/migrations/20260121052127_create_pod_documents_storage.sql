/*
  # Create POD Documents Storage Bucket

  1. Storage
    - Create public storage bucket for POD (Proof of Delivery) documents
    - Add RLS policies for secure access

  2. Security
    - Authenticated users can upload POD documents
    - Anyone can view POD documents (public bucket)
    - Admin users and document uploaders can delete POD documents
*/

-- Create storage bucket for POD documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('pod-documents', 'pod-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload POD documents
CREATE POLICY "Authenticated users can upload POD documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pod-documents');

-- Allow anyone to view POD documents (public bucket)
CREATE POLICY "Anyone can view POD documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'pod-documents');

-- Allow admin users to delete any POD document
CREATE POLICY "Admin users can delete POD documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'pod-documents'
  AND (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- Allow users to update their own POD documents
CREATE POLICY "Users can update own POD documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pod-documents'
  AND (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);
