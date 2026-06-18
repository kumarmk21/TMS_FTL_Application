-- Fix RLS policies for payment_receipts: replace always-true clauses with ownership checks

DROP POLICY IF EXISTS "update_payment_receipts" ON payment_receipts;
DROP POLICY IF EXISTS "delete_payment_receipts" ON payment_receipts;

CREATE POLICY "update_payment_receipts" ON payment_receipts
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "delete_payment_receipts" ON payment_receipts
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- Revoke public/anon/authenticated EXECUTE on SECURITY DEFINER functions
-- The trigger invokes these internally; direct RPC calls are not needed

REVOKE EXECUTE ON FUNCTION public.generate_pr_number() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_pr_number() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_pr_number() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.set_pr_number() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_pr_number() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_pr_number() FROM authenticated;
