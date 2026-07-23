ALTER TABLE lr_bill
  ADD COLUMN IF NOT EXISTS zoho_invoice_id text,
  ADD COLUMN IF NOT EXISTS zoho_invoice_number text,
  ADD COLUMN IF NOT EXISTS zoho_synced_at timestamptz;

ALTER TABLE warehouse_bill
  ADD COLUMN IF NOT EXISTS zoho_invoice_id text,
  ADD COLUMN IF NOT EXISTS zoho_invoice_number text,
  ADD COLUMN IF NOT EXISTS zoho_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_lr_bill_zoho_invoice_id
  ON lr_bill (zoho_invoice_id)
  WHERE zoho_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_warehouse_bill_zoho_invoice_id
  ON warehouse_bill (zoho_invoice_id)
  WHERE zoho_invoice_id IS NOT NULL;
