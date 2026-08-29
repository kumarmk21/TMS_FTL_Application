-- Add GST columns to lr_bill table for customer bills
ALTER TABLE public.lr_bill
  ADD COLUMN IF NOT EXISTS gst_percentage numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_charge_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS igst_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_amount numeric DEFAULT 0;

-- Update bill_amount to include GST for existing bills where bill_amount = sub_total
-- (no backfill of historical bills per requirement: only newly generated bills)
