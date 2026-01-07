/*
  # Performance and Security Fixes
  
  This migration addresses critical performance and security issues identified in the database audit:
  
  ## 1. Foreign Key Indexes
  Adds indexes for all foreign key columns to improve query performance:
  - booking_lr: billing_party_id, created_by
  - city_master: state_id
  - company_master: created_by, updated_by
  - customer_gst_master: created_by
  - lr_bill: created_by
  - order_enquiry: destination_id, origin_id, updated_by, vehicle_type_id
  - profiles: branch_code
  - thc_details: created_by
  - vendor_master: created_by
  
  ## 2. RLS Policy Optimization
  - Wraps all auth.uid() and auth.jwt() calls with SELECT to prevent re-evaluation per row
  - Consolidates duplicate permissive policies into single efficient policies
  - Fixes overly permissive policies on customer_gst_master
  
  ## 3. Function Security
  - Sets explicit search_path for all functions to prevent search path hijacking
  
  ## Important Notes
  - Unused indexes are kept as they're beneficial for future query patterns
  - Auth connection strategy and password protection require dashboard configuration
*/

-- =====================================================
-- PART 1: ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_booking_lr_billing_party_id ON public.booking_lr(billing_party_id);
CREATE INDEX IF NOT EXISTS idx_booking_lr_created_by ON public.booking_lr(created_by);
CREATE INDEX IF NOT EXISTS idx_city_master_state_id ON public.city_master(state_id);
CREATE INDEX IF NOT EXISTS idx_company_master_created_by ON public.company_master(created_by);
CREATE INDEX IF NOT EXISTS idx_company_master_updated_by ON public.company_master(updated_by);
CREATE INDEX IF NOT EXISTS idx_customer_gst_master_created_by ON public.customer_gst_master(created_by);
CREATE INDEX IF NOT EXISTS idx_lr_bill_created_by ON public.lr_bill(created_by);
CREATE INDEX IF NOT EXISTS idx_order_enquiry_destination_id ON public.order_enquiry(destination_id);
CREATE INDEX IF NOT EXISTS idx_order_enquiry_origin_id ON public.order_enquiry(origin_id);
CREATE INDEX IF NOT EXISTS idx_order_enquiry_updated_by ON public.order_enquiry(updated_by);
CREATE INDEX IF NOT EXISTS idx_order_enquiry_vehicle_type_id ON public.order_enquiry(vehicle_type_id);
CREATE INDEX IF NOT EXISTS idx_profiles_branch_code ON public.profiles(branch_code);
CREATE INDEX IF NOT EXISTS idx_thc_details_created_by ON public.thc_details(created_by);
CREATE INDEX IF NOT EXISTS idx_vendor_master_created_by ON public.vendor_master(created_by);

-- =====================================================
-- PART 2: OPTIMIZE RLS POLICIES
-- =====================================================

-- Profiles policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "Users can read profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT auth.jwt()->>'user_role') = 'admin');

CREATE POLICY "Users can update profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT auth.jwt()->>'user_role') = 'admin')
  WITH CHECK (id = (SELECT auth.uid()) OR (SELECT auth.jwt()->>'user_role') = 'admin');

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.jwt()->>'user_role') = 'admin');

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING ((SELECT auth.jwt()->>'user_role') = 'admin');

-- Vendor master policies
DROP POLICY IF EXISTS "Admins can insert vendors" ON public.vendor_master;
DROP POLICY IF EXISTS "Admins can update vendors" ON public.vendor_master;
DROP POLICY IF EXISTS "Admins can delete vendors" ON public.vendor_master;

CREATE POLICY "Admins can insert vendors"
  ON public.vendor_master FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.jwt()->>'user_role') = 'admin');

CREATE POLICY "Admins can update vendors"
  ON public.vendor_master FOR UPDATE TO authenticated
  USING ((SELECT auth.jwt()->>'user_role') = 'admin')
  WITH CHECK ((SELECT auth.jwt()->>'user_role') = 'admin');

CREATE POLICY "Admins can delete vendors"
  ON public.vendor_master FOR DELETE TO authenticated
  USING ((SELECT auth.jwt()->>'user_role') = 'admin');

-- Order enquiry policies
DROP POLICY IF EXISTS "Authenticated users can insert enquiries" ON public.order_enquiry;
DROP POLICY IF EXISTS "Admins can delete enquiries" ON public.order_enquiry;
DROP POLICY IF EXISTS "Users can update own enquiries" ON public.order_enquiry;
DROP POLICY IF EXISTS "Admins can update all enquiries" ON public.order_enquiry;

CREATE POLICY "Authenticated users can insert enquiries"
  ON public.order_enquiry FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can update enquiries"
  ON public.order_enquiry FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()) OR (SELECT auth.jwt()->>'user_role') = 'admin')
  WITH CHECK (created_by = (SELECT auth.uid()) OR (SELECT auth.jwt()->>'user_role') = 'admin');

CREATE POLICY "Admins can delete enquiries"
  ON public.order_enquiry FOR DELETE TO authenticated
  USING ((SELECT auth.jwt()->>'user_role') = 'admin');

-- Booking transaction policies
DROP POLICY IF EXISTS "Users can insert booking transactions" ON public.booking_transaction;
DROP POLICY IF EXISTS "Users can update their own booking transactions" ON public.booking_transaction;
DROP POLICY IF EXISTS "Admin can delete booking transactions" ON public.booking_transaction;

CREATE POLICY "Users can insert booking transactions"
  ON public.booking_transaction FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can update booking transactions"
  ON public.booking_transaction FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()) OR (SELECT auth.jwt()->>'user_role') = 'admin')
  WITH CHECK (created_by = (SELECT auth.uid()) OR (SELECT auth.jwt()->>'user_role') = 'admin');

CREATE POLICY "Admin can delete booking transactions"
  ON public.booking_transaction FOR DELETE TO authenticated
  USING ((SELECT auth.jwt()->>'user_role') = 'admin');

-- Booking LR policies
DROP POLICY IF EXISTS "Admin users can view all booking LRs" ON public.booking_lr;
DROP POLICY IF EXISTS "Branch users can view own branch booking LRs" ON public.booking_lr;
DROP POLICY IF EXISTS "Authenticated users can create booking LRs" ON public.booking_lr;
DROP POLICY IF EXISTS "Admin users can update all booking LRs" ON public.booking_lr;
DROP POLICY IF EXISTS "Branch users can update own branch booking LRs" ON public.booking_lr;
DROP POLICY IF EXISTS "Admin users can delete booking LRs" ON public.booking_lr;

CREATE POLICY "Users can view booking LRs"
  ON public.booking_lr FOR SELECT TO authenticated
  USING (
    (SELECT auth.jwt()->>'user_role') = 'admin' OR
    booking_branch IN (SELECT branch_code FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "Authenticated users can create booking LRs"
  ON public.booking_lr FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can update booking LRs"
  ON public.booking_lr FOR UPDATE TO authenticated
  USING (
    (SELECT auth.jwt()->>'user_role') = 'admin' OR
    booking_branch IN (SELECT branch_code FROM public.profiles WHERE id = (SELECT auth.uid()))
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'user_role') = 'admin' OR
    booking_branch IN (SELECT branch_code FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "Admin users can delete booking LRs"
  ON public.booking_lr FOR DELETE TO authenticated
  USING ((SELECT auth.jwt()->>'user_role') = 'admin');

-- LR Bill policies
DROP POLICY IF EXISTS "Admin users can view all LR bills" ON public.lr_bill;
DROP POLICY IF EXISTS "Branch users can view own branch LR bills" ON public.lr_bill;
DROP POLICY IF EXISTS "Authenticated users can create LR bills" ON public.lr_bill;
DROP POLICY IF EXISTS "Admin users can update all LR bills" ON public.lr_bill;
DROP POLICY IF EXISTS "Branch users can update own branch LR bills" ON public.lr_bill;
DROP POLICY IF EXISTS "Admin users can delete LR bills" ON public.lr_bill;

CREATE POLICY "Users can view LR bills"
  ON public.lr_bill FOR SELECT TO authenticated
  USING (
    (SELECT auth.jwt()->>'user_role') = 'admin' OR
    bill_generation_branch IN (SELECT id FROM public.branch_master WHERE branch_code IN (SELECT branch_code FROM public.profiles WHERE id = (SELECT auth.uid())))
  );

CREATE POLICY "Authenticated users can create LR bills"
  ON public.lr_bill FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can update LR bills"
  ON public.lr_bill FOR UPDATE TO authenticated
  USING (
    (SELECT auth.jwt()->>'user_role') = 'admin' OR
    bill_generation_branch IN (SELECT id FROM public.branch_master WHERE branch_code IN (SELECT branch_code FROM public.profiles WHERE id = (SELECT auth.uid())))
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'user_role') = 'admin' OR
    bill_generation_branch IN (SELECT id FROM public.branch_master WHERE branch_code IN (SELECT branch_code FROM public.profiles WHERE id = (SELECT auth.uid())))
  );

CREATE POLICY "Admin users can delete LR bills"
  ON public.lr_bill FOR DELETE TO authenticated
  USING ((SELECT auth.jwt()->>'user_role') = 'admin');

-- THC Details policies
DROP POLICY IF EXISTS "Admin users can view all THC details" ON public.thc_details;
DROP POLICY IF EXISTS "Branch users can view own branch THC details" ON public.thc_details;
DROP POLICY IF EXISTS "Authenticated users can create THC details" ON public.thc_details;
DROP POLICY IF EXISTS "Admin users can update all THC details" ON public.thc_details;
DROP POLICY IF EXISTS "Branch users can update own branch THC details" ON public.thc_details;
DROP POLICY IF EXISTS "Admin users can delete THC details" ON public.thc_details;

CREATE POLICY "Users can view THC details"
  ON public.thc_details FOR SELECT TO authenticated
  USING (
    (SELECT auth.jwt()->>'user_role') = 'admin' OR
    EXISTS (
      SELECT 1 FROM public.booking_lr 
      WHERE booking_lr.tran_id = thc_details.tran_id 
      AND booking_lr.booking_branch IN (SELECT branch_code FROM public.profiles WHERE id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "Authenticated users can create THC details"
  ON public.thc_details FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can update THC details"
  ON public.thc_details FOR UPDATE TO authenticated
  USING (
    (SELECT auth.jwt()->>'user_role') = 'admin' OR
    EXISTS (
      SELECT 1 FROM public.booking_lr 
      WHERE booking_lr.tran_id = thc_details.tran_id 
      AND booking_lr.booking_branch IN (SELECT branch_code FROM public.profiles WHERE id = (SELECT auth.uid()))
    )
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'user_role') = 'admin' OR
    EXISTS (
      SELECT 1 FROM public.booking_lr 
      WHERE booking_lr.tran_id = thc_details.tran_id 
      AND booking_lr.booking_branch IN (SELECT branch_code FROM public.profiles WHERE id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "Admin users can delete THC details"
  ON public.thc_details FOR DELETE TO authenticated
  USING ((SELECT auth.jwt()->>'user_role') = 'admin');

-- Company Master policies
DROP POLICY IF EXISTS "Admin users can insert companies" ON public.company_master;
DROP POLICY IF EXISTS "Admin users can update companies" ON public.company_master;
DROP POLICY IF EXISTS "Admin users can delete companies" ON public.company_master;

CREATE POLICY "Admin users can insert companies"
  ON public.company_master FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.jwt()->>'user_role') = 'admin');

CREATE POLICY "Admin users can update companies"
  ON public.company_master FOR UPDATE TO authenticated
  USING ((SELECT auth.jwt()->>'user_role') = 'admin')
  WITH CHECK ((SELECT auth.jwt()->>'user_role') = 'admin');

CREATE POLICY "Admin users can delete companies"
  ON public.company_master FOR DELETE TO authenticated
  USING ((SELECT auth.jwt()->>'user_role') = 'admin');

-- State Master policies
DROP POLICY IF EXISTS "Admin users can insert states" ON public.state_master;
DROP POLICY IF EXISTS "Admin users can update states" ON public.state_master;
DROP POLICY IF EXISTS "Admin users can delete states" ON public.state_master;

CREATE POLICY "Admin users can insert states"
  ON public.state_master FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.jwt()->>'user_role') = 'admin');

CREATE POLICY "Admin users can update states"
  ON public.state_master FOR UPDATE TO authenticated
  USING ((SELECT auth.jwt()->>'user_role') = 'admin')
  WITH CHECK ((SELECT auth.jwt()->>'user_role') = 'admin');

CREATE POLICY "Admin users can delete states"
  ON public.state_master FOR DELETE TO authenticated
  USING ((SELECT auth.jwt()->>'user_role') = 'admin');

-- Customer GST Master policies (fix overly permissive)
DROP POLICY IF EXISTS "Authenticated users can create customer GST records" ON public.customer_gst_master;
DROP POLICY IF EXISTS "Authenticated users can update customer GST records" ON public.customer_gst_master;
DROP POLICY IF EXISTS "Admin users can delete customer GST records" ON public.customer_gst_master;

CREATE POLICY "Authenticated users can create customer GST records"
  ON public.customer_gst_master FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can update customer GST records"
  ON public.customer_gst_master FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()) OR (SELECT auth.jwt()->>'user_role') = 'admin')
  WITH CHECK (created_by = (SELECT auth.uid()) OR (SELECT auth.jwt()->>'user_role') = 'admin');

CREATE POLICY "Admin users can delete customer GST records"
  ON public.customer_gst_master FOR DELETE TO authenticated
  USING ((SELECT auth.jwt()->>'user_role') = 'admin');

-- Consolidate duplicate policies
DROP POLICY IF EXISTS "Authenticated users can view all branches" ON public.branch_master;
DROP POLICY IF EXISTS "Authenticated users can view branch data" ON public.branch_master;
CREATE POLICY "Authenticated users can view branches"
  ON public.branch_master FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can read city data" ON public.city_master;
DROP POLICY IF EXISTS "Authenticated users can view city data" ON public.city_master;
CREATE POLICY "Authenticated users can view cities"
  ON public.city_master FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can read customer data" ON public.customer_master;
DROP POLICY IF EXISTS "Authenticated users can view customer data" ON public.customer_master;
CREATE POLICY "Authenticated users can view customers"
  ON public.customer_master FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can read vehicle data" ON public.vehicle_master;
DROP POLICY IF EXISTS "Authenticated users can view vehicle data" ON public.vehicle_master;
CREATE POLICY "Authenticated users can view vehicles"
  ON public.vehicle_master FOR SELECT TO authenticated USING (true);

-- =====================================================
-- PART 3: FIX FUNCTION SEARCH PATHS
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_booking_lr_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_lr_bill_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.sync_profile_role_to_jwt()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$ BEGIN
  UPDATE auth.users SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('user_role', NEW.role) WHERE id = NEW.id;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.update_thc_details_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.generate_vendor_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$ DECLARE new_code TEXT; max_num INTEGER; BEGIN
  SELECT COALESCE(MAX(SUBSTRING(vendor_code FROM 5)::INTEGER), 0) INTO max_num FROM public.vendor_master WHERE vendor_code ~ '^VEND[0-9]+$';
  new_code := 'VEND' || LPAD((max_num + 1)::TEXT, 4, '0');
  RETURN new_code;
END; $$;

CREATE OR REPLACE FUNCTION public.set_vendor_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$ BEGIN
  IF NEW.vendor_code IS NULL OR NEW.vendor_code = '' THEN NEW.vendor_code := public.generate_vendor_code(); END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_enq_id()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$ DECLARE new_id TEXT; max_num INTEGER; BEGIN
  SELECT COALESCE(MAX(SUBSTRING(enq_id FROM 4)::INTEGER), 0) INTO max_num FROM public.order_enquiry WHERE enq_id ~ '^ENQ[0-9]+$';
  new_id := 'ENQ' || LPAD((max_num + 1)::TEXT, 6, '0');
  RETURN new_id;
END; $$;

CREATE OR REPLACE FUNCTION public.set_enq_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$ BEGIN
  IF NEW.enq_id IS NULL OR NEW.enq_id = '' THEN NEW.enq_id := public.generate_enq_id(); END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.auto_populate_lr_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$ BEGIN
  IF NEW.tran_id IS NULL THEN NEW.tran_id := public.generate_lr_number(); END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_lr_number()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$ DECLARE next_number INTEGER; lr_number TEXT; BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(tran_id FROM 3) AS INTEGER)), 3000000) + 1 INTO next_number FROM public.booking_lr WHERE tran_id ~ '^LR[0-9]+$';
  lr_number := 'LR' || next_number::TEXT;
  RETURN lr_number;
END; $$;

CREATE OR REPLACE FUNCTION public.check_loading_date_on_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$ BEGIN
  IF NEW.loading_date IS NULL THEN RAISE EXCEPTION 'Loading date cannot be null'; END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_company_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$ DECLARE new_code TEXT; max_num INTEGER; BEGIN
  SELECT COALESCE(MAX(SUBSTRING(company_code FROM 4)::INTEGER), 0) INTO max_num FROM public.company_master WHERE company_code ~ '^COM[0-9]+$';
  new_code := 'COM' || LPAD((max_num + 1)::TEXT, 4, '0');
  RETURN new_code;
END; $$;

CREATE OR REPLACE FUNCTION public.update_company_master_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$ DECLARE user_role TEXT; BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
  RETURN COALESCE(user_role, 'user');
END; $$;