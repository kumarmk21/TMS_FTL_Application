/*
  # Fix Function Search Path Mutable

  Two functions lack a fixed search_path, making them vulnerable to search_path injection.
  This migration recreates them with SET search_path TO 'public'.

  1. generate_admin_expense_voucher_number() — no-arg variant
  2. update_account_group_updated_at() — trigger function
*/

CREATE OR REPLACE FUNCTION public.generate_admin_expense_voucher_number()
  RETURNS text
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path TO 'public'
AS $$
DECLARE
  next_num integer;
  voucher_num text;
BEGIN
  next_num := nextval('admin_expense_voucher_seq');
  voucher_num := 'AEV' || lpad(next_num::text, 6, '0');
  RETURN voucher_num;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_account_group_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
