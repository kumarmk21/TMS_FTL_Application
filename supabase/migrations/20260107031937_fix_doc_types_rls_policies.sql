/*
  # Fix Doc Types RLS Policies

  ## Changes
  
  This migration fixes the RLS policies for the doc_types table to match the correct JWT metadata access pattern used throughout the application.
  
  ## Details
  
  - Drops existing RLS policies on doc_types table
  - Recreates policies with proper JWT metadata access (app_metadata->user_role)
  - Ensures admin users can properly insert, update, and delete document types
  
  ## Security
  
  - Maintains strict access control: only admins can modify document types
  - All authenticated users can view document types
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view document types" ON public.doc_types;
DROP POLICY IF EXISTS "Admin users can insert document types" ON public.doc_types;
DROP POLICY IF EXISTS "Admin users can update document types" ON public.doc_types;
DROP POLICY IF EXISTS "Admin users can delete document types" ON public.doc_types;

-- Recreate policies with correct JWT metadata access
CREATE POLICY "Authenticated users can view document types"
  ON public.doc_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can insert document types"
  ON public.doc_types FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.jwt()->'app_metadata'->>'user_role') = 'admin');

CREATE POLICY "Admin users can update document types"
  ON public.doc_types FOR UPDATE
  TO authenticated
  USING ((SELECT auth.jwt()->'app_metadata'->>'user_role') = 'admin')
  WITH CHECK ((SELECT auth.jwt()->'app_metadata'->>'user_role') = 'admin');

CREATE POLICY "Admin users can delete document types"
  ON public.doc_types FOR DELETE
  TO authenticated
  USING ((SELECT auth.jwt()->'app_metadata'->>'user_role') = 'admin');
