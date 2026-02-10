/*
  # Fix RLS Policies - Profiles, Doc Types, Status Master
  
  Changes:
  - Use (select auth.uid()) pattern for better performance
  - Remove duplicate policies
  - Consolidate related policies
*/

DROP POLICY IF EXISTS "Users can read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON profiles;

CREATE POLICY "Users can read profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Admin users can insert document types" ON doc_types;
DROP POLICY IF EXISTS "Admin users can update document types" ON doc_types;
DROP POLICY IF EXISTS "Admin users can delete document types" ON doc_types;
DROP POLICY IF EXISTS "Authenticated users can view doc types" ON doc_types;
DROP POLICY IF EXISTS "Authenticated users can create doc types" ON doc_types;
DROP POLICY IF EXISTS "Authenticated users can update doc types" ON doc_types;
DROP POLICY IF EXISTS "Authenticated users can delete doc types" ON doc_types;
DROP POLICY IF EXISTS "Authenticated users can view document types" ON doc_types;
DROP POLICY IF EXISTS "Admin users can manage document types" ON doc_types;

CREATE POLICY "Authenticated users can view document types"
  ON doc_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can manage document types"
  ON doc_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can update statuses" ON status_master;
DROP POLICY IF EXISTS "Admin users can delete statuses" ON status_master;
DROP POLICY IF EXISTS "Authenticated users can create status" ON status_master;
DROP POLICY IF EXISTS "Authenticated users can insert statuses" ON status_master;
DROP POLICY IF EXISTS "Authenticated users can view status" ON status_master;
DROP POLICY IF EXISTS "Authenticated users can view statuses" ON status_master;
DROP POLICY IF EXISTS "Authenticated users can update status" ON status_master;
DROP POLICY IF EXISTS "Authenticated users can delete status" ON status_master;
DROP POLICY IF EXISTS "Authenticated users can manage statuses" ON status_master;

CREATE POLICY "Authenticated users can view statuses"
  ON status_master FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage statuses"
  ON status_master FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );
