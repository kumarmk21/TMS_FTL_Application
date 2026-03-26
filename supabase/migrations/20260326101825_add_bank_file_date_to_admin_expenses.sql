/*
  # Add bank_file_date to admin_expenses_transaction

  1. Changes
    - Adds `bank_file_date` (date, nullable) to track when a record was exported to a bank payment file
    - Adds index on bank_file_date for query performance

  2. Purpose
    - Enables the Admin Payment Bank File module to filter unpaid records (bank_file_date IS NULL)
    - Once exported, the date is stamped to prevent duplicate exports
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_expenses_transaction' AND column_name = 'bank_file_date'
  ) THEN
    ALTER TABLE admin_expenses_transaction ADD COLUMN bank_file_date date;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_admin_expenses_bank_file_date ON admin_expenses_transaction(bank_file_date);
CREATE INDEX IF NOT EXISTS idx_admin_expenses_voucher_date ON admin_expenses_transaction(voucher_date);
CREATE INDEX IF NOT EXISTS idx_admin_expenses_account_id ON admin_expenses_transaction(account_id);
