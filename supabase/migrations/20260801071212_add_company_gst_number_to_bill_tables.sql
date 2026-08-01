/*
  # Add Company GST Number Columns to Bill Tables

  1. Modified Tables
    - `lr_bill`: Add `company_gst_number` (text, nullable) - Stores the selected company GST number as reference
    - `warehouse_bill`: Add `company_gst_number` (text, nullable) - Stores the selected company GST number as reference

  2. Notes
    - These columns are reference-only fields. They store the company GST number selected
      during bill generation for display on printed bills.
    - No tax calculation logic is tied to these fields.
    - Nullable because existing bills created before this feature won't have a value.
*/

ALTER TABLE lr_bill ADD COLUMN IF NOT EXISTS company_gst_number text;
ALTER TABLE warehouse_bill ADD COLUMN IF NOT EXISTS company_gst_number text;
