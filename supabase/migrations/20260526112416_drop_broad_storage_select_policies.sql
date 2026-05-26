/*
  # Drop Broad Storage SELECT Policies on Public Buckets

  Public buckets serve object URLs directly without requiring a SELECT policy on
  storage.objects — the bucket's public flag handles that. The broad SELECT policies
  (no path restriction) are what enables clients to list ALL files in the bucket,
  which is the security issue. Dropping them removes listing access while keeping
  direct URL access intact.

  Policies dropped:
  - "Authenticated users can view company logos" (company-logos)
  - "Authenticated users can view POD documents" (pod-documents)
  - "Authenticated users can view profile photos" (profile-photos)

  Note: consol-bill-ack already has a restricted policy from the previous migration.
*/

DROP POLICY IF EXISTS "Authenticated users can view company logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view POD documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view profile photos" ON storage.objects;
