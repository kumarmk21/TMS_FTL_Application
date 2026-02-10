/*
  # Fix RLS Policies - SAC Code, Warehouse Bill, Customer Rate Master
  
  Changes:
  - Use (select auth.uid()) pattern for better performance
  - Remove duplicate policies
  - Consolidate related policies
*/

DROP POLICY IF EXISTS "Authenticated users can view active SAC codes" ON sac_code_master;
DROP POLICY IF EXISTS "Admin users can insert SAC codes" ON sac_code_master;
DROP POLICY IF EXISTS "Admin users can update SAC codes" ON sac_code_master;
DROP POLICY IF EXISTS "Admin users can delete SAC codes" ON sac_code_master;
DROP POLICY IF EXISTS "Authenticated users can view SAC codes" ON sac_code_master;
DROP POLICY IF EXISTS "Admin users can manage SAC codes" ON sac_code_master;

CREATE POLICY "Authenticated users can view SAC codes"
  ON sac_code_master FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can manage SAC codes"
  ON sac_code_master FOR ALL
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

DROP POLICY IF EXISTS "Admin users can view all warehouse bills" ON warehouse_bill;
DROP POLICY IF EXISTS "Branch users can view own branch warehouse bills" ON warehouse_bill;
DROP POLICY IF EXISTS "Authenticated users can create warehouse bills" ON warehouse_bill;
DROP POLICY IF EXISTS "Admin users can update all warehouse bills" ON warehouse_bill;
DROP POLICY IF EXISTS "Branch users can update own branch warehouse bills" ON warehouse_bill;
DROP POLICY IF EXISTS "Admin users can delete warehouse bills" ON warehouse_bill;
DROP POLICY IF EXISTS "Authenticated users can view warehouse bills" ON warehouse_bill;
DROP POLICY IF EXISTS "Authenticated users can update warehouse bills" ON warehouse_bill;

CREATE POLICY "Authenticated users can view warehouse bills"
  ON warehouse_bill FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Authenticated users can create warehouse bills"
  ON warehouse_bill FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Authenticated users can update warehouse bills"
  ON warehouse_bill FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      LEFT JOIN branch_master b ON b.branch_code = p.branch_code
      WHERE p.id = (select auth.uid())
      AND (
        p.role = 'admin' 
        OR b.id = warehouse_bill.bill_generation_branch
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      LEFT JOIN branch_master b ON b.branch_code = p.branch_code
      WHERE p.id = (select auth.uid())
      AND (
        p.role = 'admin' 
        OR b.id = warehouse_bill.bill_generation_branch
      )
    )
  );

CREATE POLICY "Admin users can delete warehouse bills"
  ON warehouse_bill FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin users can view all customer rates" ON customer_rate_master;
DROP POLICY IF EXISTS "Branch users can view all customer rates" ON customer_rate_master;
DROP POLICY IF EXISTS "Authenticated users can create customer rates" ON customer_rate_master;
DROP POLICY IF EXISTS "Admin users can update all customer rates" ON customer_rate_master;
DROP POLICY IF EXISTS "Branch users can update customer rates" ON customer_rate_master;
DROP POLICY IF EXISTS "Admin users can delete customer rates" ON customer_rate_master;
DROP POLICY IF EXISTS "Authenticated users can view customer rates" ON customer_rate_master;
DROP POLICY IF EXISTS "Authenticated users can update customer rates" ON customer_rate_master;

CREATE POLICY "Authenticated users can view customer rates"
  ON customer_rate_master FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create customer rates"
  ON customer_rate_master FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Authenticated users can update customer rates"
  ON customer_rate_master FOR UPDATE
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

CREATE POLICY "Admin users can delete customer rates"
  ON customer_rate_master FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );
