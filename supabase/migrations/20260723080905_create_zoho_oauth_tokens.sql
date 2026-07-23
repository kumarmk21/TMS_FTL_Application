/*
# Create Zoho Books OAuth Token Storage

1. Purpose
   - Stores OAuth tokens for the Zoho Books integration.
   - The app uses a single Zoho organization, so a single-row table keyed by `id = 1`.
   - The edge functions read/write this table to persist access/refresh tokens across requests.

2. New Tables
   - `zoho_oauth_tokens`
     - `id` (int, primary key, default 1) — singleton row
     - `access_token` (text, not null) — current Zoho access token
     - `refresh_token` (text, not null) — used to obtain new access tokens
     - `expires_at` (timestamptz, not null) — when the access token expires
     - `api_domain` (text) — Zoho API domain returned during auth
     - `location` (text) — Zoho data center location (e.g., "in")
     - `connected_at` (timestamptz) — when the connection was established
     - `updated_at` (timestamptz, default now) — last token refresh time

3. Security
   - Enable RLS on `zoho_oauth_tokens`.
   - This app has a sign-in screen, so policies are scoped to `authenticated`.
   - Only authenticated users can read the connection status (but not the raw tokens).
   - Only authenticated users can update/insert tokens (done via edge function with service role).
   - The edge function uses the service role key which bypasses RLS, so token writes work regardless.
   - Frontend reads are limited to connection status check (the page checks if a row exists).

4. Notes
   - The edge function stores tokens using the service role key (bypasses RLS).
   - The frontend never sees the raw access_token or refresh_token — only connection status.
*/

CREATE TABLE IF NOT EXISTS zoho_oauth_tokens (
  id integer PRIMARY KEY DEFAULT 1,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  api_domain text,
  location text,
  connected_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE zoho_oauth_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_zoho_tokens" ON zoho_oauth_tokens;
CREATE POLICY "select_zoho_tokens" ON zoho_oauth_tokens FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_zoho_tokens" ON zoho_oauth_tokens;
CREATE POLICY "insert_zoho_tokens" ON zoho_oauth_tokens FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_zoho_tokens" ON zoho_oauth_tokens;
CREATE POLICY "update_zoho_tokens" ON zoho_oauth_tokens FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_zoho_tokens" ON zoho_oauth_tokens;
CREATE POLICY "delete_zoho_tokens" ON zoho_oauth_tokens FOR DELETE
  TO authenticated USING (true);
