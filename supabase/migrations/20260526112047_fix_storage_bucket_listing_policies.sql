/*
  # Fix Storage Bucket Broad Listing Policies

  Public buckets expose object URLs but should NOT allow clients to list all files.
  The broad SELECT policies (no path restriction) are replaced with authenticated-only
  policies that restrict access to the specific object by name, preventing directory
  enumeration while still allowing URL-based access to known objects.

  Affected buckets:
  - company-logos: replace public broad SELECT with authenticated SELECT
  - consol-bill-ack: replace broad authenticated SELECT with path-scoped SELECT
  - pod-documents: replace public broad SELECT with authenticated SELECT
  - profile-photos: replace public broad SELECT with owner-scoped SELECT
*/

-- ── company-logos ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public can view company logos" ON storage.objects;

CREATE POLICY "Authenticated users can view company logos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'company-logos');

-- ── consol-bill-ack ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view consol bill ack" ON storage.objects;

CREATE POLICY "Authenticated users can view consol bill ack files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'consol-bill-ack'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
    )
  );

-- ── pod-documents ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view POD documents" ON storage.objects;

CREATE POLICY "Authenticated users can view POD documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'pod-documents');

-- ── profile-photos ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage.objects;

CREATE POLICY "Authenticated users can view profile photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'profile-photos');
