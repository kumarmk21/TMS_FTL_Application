/*
  # Security Fixes Part 3: Fix Multiple Permissive Policies

  1. Multiple Permissive Policies
    - Consolidate duplicate SELECT policies on doc_types, sac_code_master, status_master, vendor_master
    - Ensures only one policy per action to avoid confusion
*/

-- =====================================================
-- FIX MULTIPLE PERMISSIVE POLICIES
-- =====================================================

-- Doc Types: Consolidate to single SELECT policy
DROP POLICY IF EXISTS "Admin users can manage document types" ON public.doc_types;
DROP POLICY IF EXISTS "Authenticated users can view document types" ON public.doc_types;
CREATE POLICY "Authenticated users can view document types"
  ON public.doc_types FOR SELECT
  TO authenticated
  USING (true);

-- SAC Code Master: Consolidate to single SELECT policy
DROP POLICY IF EXISTS "Admin users can manage SAC codes" ON public.sac_code_master;
DROP POLICY IF EXISTS "Authenticated users can view SAC codes" ON public.sac_code_master;
CREATE POLICY "Authenticated users can view SAC codes"
  ON public.sac_code_master FOR SELECT
  TO authenticated
  USING (true);

-- Status Master: Consolidate to single SELECT policy
DROP POLICY IF EXISTS "Authenticated users can manage statuses" ON public.status_master;
DROP POLICY IF EXISTS "Authenticated users can view statuses" ON public.status_master;
CREATE POLICY "Authenticated users can view statuses"
  ON public.status_master FOR SELECT
  TO authenticated
  USING (true);

-- Vendor Master: Consolidate to single SELECT policy
DROP POLICY IF EXISTS "Authenticated users can manage vendors" ON public.vendor_master;
DROP POLICY IF EXISTS "Authenticated users can view vendors" ON public.vendor_master;
CREATE POLICY "Authenticated users can view vendors"
  ON public.vendor_master FOR SELECT
  TO authenticated
  USING (true);