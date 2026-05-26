/*
  # Revoke EXECUTE on SECURITY DEFINER Functions from public role

  Previous migrations revoked from anon/authenticated directly, but PostgreSQL's
  permission inheritance means the `public` pseudo-role still grants EXECUTE to
  both anon and authenticated. Revoking from `public` is the correct fix.

  All functions below are trigger functions or internal helpers — they must never
  be callable directly via the PostgREST RPC interface.
*/

REVOKE EXECUTE ON FUNCTION public.auto_populate_admin_expense_voucher_number() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_populate_consol_bill_number_booking() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_populate_consol_bill_number_lr_bill() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_bth_due_date() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_loading_date_on_insert() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_admin_expense_voucher_number() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_admin_expense_voucher_number(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_company_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_consol_bill_number() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_enq_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_vendor_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_thc_upload_batches() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_consol_bill_pending_amount() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_enq_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_vendor_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_profile_role_to_jwt() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_account_group_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_booking_lr_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_branch_master_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_company_master_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_consol_bill_updated_date() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_lr_bill_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_thc_details_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
