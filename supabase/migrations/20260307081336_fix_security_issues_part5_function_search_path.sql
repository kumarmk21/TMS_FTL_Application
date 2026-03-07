/*
  # Security Fixes Part 5: Fix Function Search Path Mutability

  1. Function Search Path
    - Fix mutable search_path issues in database functions
    - Add SET search_path = public to all affected functions
*/

-- =====================================================
-- FIX FUNCTION SEARCH PATH MUTABILITY
-- =====================================================

-- Fix generate_admin_expense_voucher_number
DROP FUNCTION IF EXISTS public.generate_admin_expense_voucher_number(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.generate_admin_expense_voucher_number(p_branch_id uuid)
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

  SELECT COALESCE(MAX(CAST(SUBSTRING(admin_expense_voucher_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO v_next_number
  FROM admin_expenses_transaction
  WHERE admin_expense_voucher_number LIKE 'AE-' || v_branch_code || '-%';

  v_voucher_number := 'AE-' || v_branch_code || '-' || LPAD(v_next_number::text, 6, '0');

  RETURN v_voucher_number;
END;
$$;

-- Fix auto_populate_admin_expense_voucher_number
CREATE OR REPLACE FUNCTION public.auto_populate_admin_expense_voucher_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.admin_expense_voucher_number IS NULL THEN
    NEW.admin_expense_voucher_number := generate_admin_expense_voucher_number(NEW.transaction_branch_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate triggers
DROP TRIGGER IF EXISTS trigger_auto_populate_admin_expense_voucher_number ON public.admin_expenses_transaction;
CREATE TRIGGER trigger_auto_populate_admin_expense_voucher_number
  BEFORE INSERT ON public.admin_expenses_transaction
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_admin_expense_voucher_number();

DROP TRIGGER IF EXISTS set_admin_expense_voucher_number ON public.admin_expenses_transaction;
CREATE TRIGGER set_admin_expense_voucher_number
  BEFORE INSERT ON public.admin_expenses_transaction
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_admin_expense_voucher_number();

-- Fix get_thc_upload_batches
DROP FUNCTION IF EXISTS public.get_thc_upload_batches();
CREATE OR REPLACE FUNCTION public.get_thc_upload_batches()
RETURNS TABLE (
  batch_date date,
  record_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) as batch_date,
    COUNT(*) as record_count
  FROM thc_details
  WHERE thc_id_number IS NOT NULL
    AND thc_id_number != ''
  GROUP BY DATE(created_at)
  ORDER BY DATE(created_at) DESC;
END;
$$;