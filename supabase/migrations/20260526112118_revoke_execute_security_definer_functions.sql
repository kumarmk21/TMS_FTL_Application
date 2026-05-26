/*
  # Revoke Public EXECUTE on SECURITY DEFINER Functions

  All functions listed below are either trigger functions or internal helpers.
  They must NOT be callable directly via the PostgREST RPC interface by anon
  or authenticated roles. Revoking EXECUTE prevents exploitation of elevated
  privileges through the public API.

  Functions covered:
  - Trigger functions: auto_populate_*, calculate_bth_due_date,
    check_loading_date_on_insert, handle_new_user, handle_updated_at,
    set_consol_bill_pending_amount, set_enq_id, set_vendor_code,
    sync_profile_role_to_jwt, update_*_at / update_*_updated_*,
    update_account_group_updated_at, update_updated_at_column
  - Internal helpers: generate_admin_expense_voucher_number (both variants),
    generate_company_code, generate_consol_bill_number, generate_enq_id,
    generate_vendor_code, get_thc_upload_batches, get_user_role (both variants),
    is_admin
*/

-- Trigger functions — no arguments
REVOKE EXECUTE ON FUNCTION public.auto_populate_admin_expense_voucher_number() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_populate_consol_bill_number_booking() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_populate_consol_bill_number_lr_bill() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_bth_due_date() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_loading_date_on_insert() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_consol_bill_pending_amount() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_enq_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_vendor_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profile_role_to_jwt() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_account_group_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_booking_lr_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_branch_master_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_company_master_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_consol_bill_updated_date() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_lr_bill_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_thc_details_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;

-- Internal helper functions
REVOKE EXECUTE ON FUNCTION public.generate_admin_expense_voucher_number() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_admin_expense_voucher_number(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_company_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_consol_bill_number() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_enq_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_vendor_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_thc_upload_batches() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, authenticated;
