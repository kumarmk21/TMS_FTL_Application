/*
  # Fix admin_expenses_transaction triggers

  ## Problem
  Two triggers fire on INSERT on admin_expenses_transaction, both calling
  auto_populate_admin_expense_voucher_number(). That function references
  NEW.admin_expense_voucher_number and NEW.transaction_branch_id which do not
  exist in the table (correct columns are voucher_number and branch_id),
  causing a Postgres error on every insert.

  ## Changes
  1. Drop both duplicate triggers
  2. Fix the auto_populate function to use correct column names
  3. Fix the generate function to use correct column name in its query
  4. Re-create a single trigger
*/

DROP TRIGGER IF EXISTS set_admin_expense_voucher_number ON admin_expenses_transaction;
DROP TRIGGER IF EXISTS trigger_auto_populate_admin_expense_voucher_number ON admin_expenses_transaction;

CREATE OR REPLACE FUNCTION generate_admin_expense_voucher_number(p_branch_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch_code text;
  v_next_number integer;
  v_voucher_number text;
BEGIN
  SELECT branch_code INTO v_branch_code
  FROM branch_master
  WHERE id = p_branch_id;

  IF v_branch_code IS NULL THEN
    RAISE EXCEPTION 'Branch not found for ID: %', p_branch_id;
  END IF;

  SELECT COALESCE(MAX(CAST(SUBSTRING(voucher_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO v_next_number
  FROM admin_expenses_transaction
  WHERE voucher_number LIKE 'AE-' || v_branch_code || '-%';

  v_voucher_number := 'AE-' || v_branch_code || '-' || LPAD(v_next_number::text, 6, '0');

  RETURN v_voucher_number;
END;
$$;

CREATE OR REPLACE FUNCTION auto_populate_admin_expense_voucher_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.voucher_number IS NULL AND NEW.branch_id IS NOT NULL THEN
    NEW.voucher_number := generate_admin_expense_voucher_number(NEW.branch_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_admin_expense_voucher_number
  BEFORE INSERT ON admin_expenses_transaction
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_admin_expense_voucher_number();
