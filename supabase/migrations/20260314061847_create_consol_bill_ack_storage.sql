/*
  # Create Storage Bucket for Consol Bill Acknowledgements

  ## Summary
  Creates a storage bucket for uploading consolidation bill acknowledgement files (images/PDFs).

  ## Changes
  - Creates `consol-bill-ack` storage bucket (public read, authenticated write)
  - Adds RLS policies for the bucket objects
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('consol-bill-ack', 'consol-bill-ack', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload consol bill ack"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'consol-bill-ack');

CREATE POLICY "Anyone can view consol bill ack"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'consol-bill-ack');

CREATE POLICY "Authenticated users can update consol bill ack"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'consol-bill-ack');

CREATE POLICY "Authenticated users can delete consol bill ack"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'consol-bill-ack');
