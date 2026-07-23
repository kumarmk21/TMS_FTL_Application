ALTER TABLE customer_master
  ADD COLUMN IF NOT EXISTS zoho_customer_id text;

ALTER TABLE zoho_oauth_tokens
  ADD COLUMN IF NOT EXISTS organization_id text;

CREATE INDEX IF NOT EXISTS idx_customer_master_zoho_customer_id
  ON customer_master (zoho_customer_id)
  WHERE zoho_customer_id IS NOT NULL;
