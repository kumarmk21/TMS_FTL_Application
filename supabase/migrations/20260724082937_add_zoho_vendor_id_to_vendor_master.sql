-- Add Zoho Books contact ID column for vendor sync (mirrors zoho_customer_id on customer_master)
ALTER TABLE vendor_master
ADD COLUMN IF NOT EXISTS zoho_vendor_id text;

COMMENT ON COLUMN vendor_master.zoho_vendor_id IS 'Zoho Books contact ID for this vendor (vendor contact type), populated by sync-vendors action';
