ALTER TABLE zoho_oauth_tokens
  ADD COLUMN IF NOT EXISTS client_id text,
  ADD COLUMN IF NOT EXISTS client_secret text,
  ADD COLUMN IF NOT EXISTS redirect_uri text;

ALTER TABLE zoho_oauth_tokens
  ALTER COLUMN access_token DROP NOT NULL,
  ALTER COLUMN refresh_token DROP NOT NULL,
  ALTER COLUMN expires_at DROP NOT NULL,
  ALTER COLUMN api_domain DROP NOT NULL,
  ALTER COLUMN location DROP NOT NULL,
  ALTER COLUMN connected_at DROP NOT NULL;

UPDATE zoho_oauth_tokens
  SET
    client_id = '1000.TNQSBLC381L6JCVRB47LL8D1M80OLK',
    client_secret = '78eb6e6b0cf9b0f0833db149b625e7927a99fdd451',
    redirect_uri = 'https://tms.dlslogistics.in'
WHERE id = 1;

INSERT INTO zoho_oauth_tokens (id, client_id, client_secret, redirect_uri)
VALUES (1, '1000.TNQSBLC381L6JCVRB47LL8D1M80OLK', '78eb6e6b0cf9b0f0833db149b625e7927a99fdd451', 'https://tms.dlslogistics.in')
ON CONFLICT (id) DO UPDATE SET
  client_id = EXCLUDED.client_id,
  client_secret = EXCLUDED.client_secret,
  redirect_uri = EXCLUDED.redirect_uri;
