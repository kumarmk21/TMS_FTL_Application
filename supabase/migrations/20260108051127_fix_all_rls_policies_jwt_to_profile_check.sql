/*
  # Fix All RLS Policies - Replace JWT Checks with Profile Table Checks
  
  1. Changes
    - Replace all auth.jwt()->>'user_role' checks with direct profiles table lookups
    - Affects all tables: profiles, order_enquiry, booking_lr, lr_bill, thc_details, 
      company_master, state_master, customer_gst_master, and more
    
  2. Security
    - Maintains exact same security rules
    - More reliable as it checks current database state instead of JWT metadata
    
  3. Performance
    - Uses indexed lookups on profiles table
    - Wrapped in SELECT to prevent row-by-row re-evaluation
*/

-- =====================================================
-- PROFILES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "Users can read profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can update profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- ORDER ENQUIRY TABLE
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can insert enquiries" ON public.order_enquiry;
DROP POLICY IF EXISTS "Users can update enquiries" ON public.order_enquiry;
DROP POLICY IF EXISTS "Admins can delete enquiries" ON public.order_enquiry;

CREATE POLICY "Authenticated users can insert enquiries"
  ON public.order_enquiry FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update enquiries"
  ON public.order_enquiry FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete enquiries"
  ON public.order_enquiry FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- BOOKING TRANSACTION TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can insert booking transactions" ON public.booking_transaction;
DROP POLICY IF EXISTS "Users can update booking transactions" ON public.booking_transaction;
DROP POLICY IF EXISTS "Admin can delete booking transactions" ON public.booking_transaction;

CREATE POLICY "Users can insert booking transactions"
  ON public.booking_transaction FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update booking transactions"
  ON public.booking_transaction FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can delete booking transactions"
  ON public.booking_transaction FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- BOOKING LR TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view booking LRs" ON public.booking_lr;
DROP POLICY IF EXISTS "Authenticated users can create booking LRs" ON public.booking_lr;
DROP POLICY IF EXISTS "Users can update booking LRs" ON public.booking_lr;
DROP POLICY IF EXISTS "Admin users can delete booking LRs" ON public.booking_lr;

CREATE POLICY "Users can view booking LRs"
  ON public.booking_lr FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR
    booking_branch IN (SELECT branch_code FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Authenticated users can create booking LRs"
  ON public.booking_lr FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update booking LRs"
  ON public.booking_lr FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR
    booking_branch IN (SELECT branch_code FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR
    booking_branch IN (SELECT branch_code FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admin users can delete booking LRs"
  ON public.booking_lr FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- LR BILL TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view LR bills" ON public.lr_bill;
DROP POLICY IF EXISTS "Authenticated users can create LR bills" ON public.lr_bill;
DROP POLICY IF EXISTS "Users can update LR bills" ON public.lr_bill;
DROP POLICY IF EXISTS "Admin users can delete LR bills" ON public.lr_bill;

CREATE POLICY "Users can view LR bills"
  ON public.lr_bill FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR
    bill_generation_branch IN (SELECT id FROM public.branch_master WHERE branch_code IN (SELECT branch_code FROM public.profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Authenticated users can create LR bills"
  ON public.lr_bill FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update LR bills"
  ON public.lr_bill FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR
    bill_generation_branch IN (SELECT id FROM public.branch_master WHERE branch_code IN (SELECT branch_code FROM public.profiles WHERE id = auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR
    bill_generation_branch IN (SELECT id FROM public.branch_master WHERE branch_code IN (SELECT branch_code FROM public.profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Admin users can delete LR bills"
  ON public.lr_bill FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- THC DETAILS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view THC details" ON public.thc_details;
DROP POLICY IF EXISTS "Authenticated users can create THC details" ON public.thc_details;
DROP POLICY IF EXISTS "Users can update THC details" ON public.thc_details;
DROP POLICY IF EXISTS "Admin users can delete THC details" ON public.thc_details;

CREATE POLICY "Users can view THC details"
  ON public.thc_details FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR
    EXISTS (
      SELECT 1 FROM public.booking_lr 
      WHERE booking_lr.tran_id = thc_details.tran_id 
      AND booking_lr.booking_branch IN (SELECT branch_code FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Authenticated users can create THC details"
  ON public.thc_details FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update THC details"
  ON public.thc_details FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR
    EXISTS (
      SELECT 1 FROM public.booking_lr 
      WHERE booking_lr.tran_id = thc_details.tran_id 
      AND booking_lr.booking_branch IN (SELECT branch_code FROM public.profiles WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR
    EXISTS (
      SELECT 1 FROM public.booking_lr 
      WHERE booking_lr.tran_id = thc_details.tran_id 
      AND booking_lr.booking_branch IN (SELECT branch_code FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admin users can delete THC details"
  ON public.thc_details FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- COMPANY MASTER TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admin users can insert companies" ON public.company_master;
DROP POLICY IF EXISTS "Admin users can update companies" ON public.company_master;
DROP POLICY IF EXISTS "Admin users can delete companies" ON public.company_master;

CREATE POLICY "Admin users can insert companies"
  ON public.company_master FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin users can update companies"
  ON public.company_master FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin users can delete companies"
  ON public.company_master FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- STATE MASTER TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admin users can insert states" ON public.state_master;
DROP POLICY IF EXISTS "Admin users can update states" ON public.state_master;
DROP POLICY IF EXISTS "Admin users can delete states" ON public.state_master;

CREATE POLICY "Admin users can insert states"
  ON public.state_master FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin users can update states"
  ON public.state_master FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin users can delete states"
  ON public.state_master FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- CUSTOMER GST MASTER TABLE
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can create customer GST records" ON public.customer_gst_master;
DROP POLICY IF EXISTS "Users can update customer GST records" ON public.customer_gst_master;
DROP POLICY IF EXISTS "Admin users can delete customer GST records" ON public.customer_gst_master;

CREATE POLICY "Authenticated users can create customer GST records"
  ON public.customer_gst_master FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update customer GST records"
  ON public.customer_gst_master FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin users can delete customer GST records"
  ON public.customer_gst_master FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
