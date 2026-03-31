/*
  # Fix admin_expenses_transaction account_group_id foreign key

  ## Problem
  The column account_group_id in admin_expenses_transaction has a FK constraint
  referencing account_group.group_id. However, the application populates this
  field using IDs from account_group_master.id (a separate table), causing a FK
  violation on every insert.

  ## Fix
  Drop the incorrect FK constraint and add a correct one referencing
  account_group_master.id.
*/

ALTER TABLE admin_expenses_transaction
  DROP CONSTRAINT IF EXISTS admin_expenses_transaction_account_group_id_fkey;

ALTER TABLE admin_expenses_transaction
  ADD CONSTRAINT admin_expenses_transaction_account_group_id_fkey
  FOREIGN KEY (account_group_id) REFERENCES account_group_master(id) ON DELETE SET NULL;
