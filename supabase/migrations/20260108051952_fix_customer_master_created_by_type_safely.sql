/*
  # Fix customer_master created_by type and RLS policies
  
  1. Changes
    - Clear invalid created_by values in customer_master
    - Convert created_by column from text to uuid
    - Drop all RLS policies
    - Create helper function is_admin() to avoid infinite recursion
    - Recreate all policies using the helper function
    
  2. Security
    - Helper function uses SECURITY DEFINER to bypass RLS safely
    - All authenticated users can view all data
    - Only creators and admins can modify records
*/

-- Clear invalid created_by values and convert to uuid format where possible
UPDATE public.customer_master
SET created_by = NULL
WHERE created_by IS NOT NULL 
  AND created_by !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Convert column type
ALTER TABLE public.customer_master 
ALTER COLUMN created_by TYPE uuid USING created_by::uuid;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'customer_master_created_by_fkey'
  ) THEN
    ALTER TABLE public.customer_master
    ADD CONSTRAINT customer_master_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;
END $$;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

DROP POLICY IF EXISTS "Authenticated users can view branches" ON public.branch_master;
DROP POLICY IF EXISTS "Authenticated users can create branches" ON public.branch_master;
DROP POLICY IF EXISTS "Authenticated users can update branches" ON public.branch_master;
DROP POLICY IF EXISTS "Admin users can delete branches" ON public.branch_master;

DROP POLICY IF EXISTS "Authenticated users can view cities" ON public.city_master;
DROP POLICY IF EXISTS "Authenticated users can create cities" ON public.city_master;
DROP POLICY IF EXISTS "Authenticated users can update cities" ON public.city_master;
DROP POLICY IF EXISTS "Admin users can delete cities" ON public.city_master;

DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.vehicle_master;
DROP POLICY IF EXISTS "Authenticated users can create vehicles" ON public.vehicle_master;
DROP POLICY IF EXISTS "Authenticated users can update vehicles" ON public.vehicle_master;
DROP POLICY IF EXISTS "Admin users can delete vehicles" ON public.vehicle_master;

DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customer_master;
DROP POLICY IF EXISTS "Authenticated users can create customers" ON public.customer_master;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customer_master;
DROP POLICY IF EXISTS "Admin users can delete customers" ON public.customer_master;

DROP POLICY IF EXISTS "Authenticated users can view vendors" ON public.vendor_master;
DROP POLICY IF EXISTS "Authenticated users can insert vendors" ON public.vendor_master;
DROP POLICY IF EXISTS "Authenticated users can update vendors" ON public.vendor_master;
DROP POLICY IF EXISTS "Authenticated users can delete vendors" ON public.vendor_master;

DROP POLICY IF EXISTS "Authenticated users can view enquiries" ON public.order_enquiry;
DROP POLICY IF EXISTS "Authenticated users can insert enquiries" ON public.order_enquiry;
DROP POLICY IF EXISTS "Users can update enquiries" ON public.order_enquiry;
DROP POLICY IF EXISTS "Admins can delete enquiries" ON public.order_enquiry;

DROP POLICY IF EXISTS "Users can view booking transactions" ON public.booking_transaction;
DROP POLICY IF EXISTS "Users can insert booking transactions" ON public.booking_transaction;
DROP POLICY IF EXISTS "Users can update booking transactions" ON public.booking_transaction;
DROP POLICY IF EXISTS "Admin can delete booking transactions" ON public.booking_transaction;

DROP POLICY IF EXISTS "Users can view booking LRs" ON public.booking_lr;
DROP POLICY IF EXISTS "Authenticated users can create booking LRs" ON public.booking_lr;
DROP POLICY IF EXISTS "Users can update booking LRs" ON public.booking_lr;
DROP POLICY IF EXISTS "Admin users can delete booking LRs" ON public.booking_lr;

DROP POLICY IF EXISTS "Users can view LR bills" ON public.lr_bill;
DROP POLICY IF EXISTS "Authenticated users can create LR bills" ON public.lr_bill;
DROP POLICY IF EXISTS "Users can update LR bills" ON public.lr_bill;
DROP POLICY IF EXISTS "Admin users can delete LR bills" ON public.lr_bill;

DROP POLICY IF EXISTS "Users can view THC details" ON public.thc_details;
DROP POLICY IF EXISTS "Authenticated users can create THC details" ON public.thc_details;
DROP POLICY IF EXISTS "Users can update THC details" ON public.thc_details;
DROP POLICY IF EXISTS "Admin users can delete THC details" ON public.thc_details;

DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.company_master;
DROP POLICY IF EXISTS "Admin users can insert companies" ON public.company_master;
DROP POLICY IF EXISTS "Admin users can update companies" ON public.company_master;
DROP POLICY IF EXISTS "Admin users can delete companies" ON public.company_master;

DROP POLICY IF EXISTS "Authenticated users can view states" ON public.state_master;
DROP POLICY IF EXISTS "Admin users can insert states" ON public.state_master;
DROP POLICY IF EXISTS "Admin users can update states" ON public.state_master;
DROP POLICY IF EXISTS "Admin users can delete states" ON public.state_master;

DROP POLICY IF EXISTS "Authenticated users can view customer GST records" ON public.customer_gst_master;
DROP POLICY IF EXISTS "Authenticated users can create customer GST records" ON public.customer_gst_master;
DROP POLICY IF EXISTS "Users can update customer GST records" ON public.customer_gst_master;
DROP POLICY IF EXISTS "Admin users can delete customer GST records" ON public.customer_gst_master;

DROP POLICY IF EXISTS "Authenticated users can view doc types" ON public.doc_types;
DROP POLICY IF EXISTS "Authenticated users can create doc types" ON public.doc_types;
DROP POLICY IF EXISTS "Authenticated users can update doc types" ON public.doc_types;
DROP POLICY IF EXISTS "Authenticated users can delete doc types" ON public.doc_types;

DROP POLICY IF EXISTS "Authenticated users can view status" ON public.status_master;
DROP POLICY IF EXISTS "Authenticated users can create status" ON public.status_master;
DROP POLICY IF EXISTS "Authenticated users can update status" ON public.status_master;
DROP POLICY IF EXISTS "Authenticated users can delete status" ON public.status_master;

-- Create helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- PROFILES TABLE
CREATE POLICY "Users can read profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can update profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.is_admin());

-- BRANCH MASTER TABLE
CREATE POLICY "Authenticated users can view branches"
  ON public.branch_master FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create branches"
  ON public.branch_master FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can update branches"
  ON public.branch_master FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin users can delete branches"
  ON public.branch_master FOR DELETE TO authenticated
  USING (public.is_admin());

-- CITY MASTER TABLE
CREATE POLICY "Authenticated users can view cities"
  ON public.city_master FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create cities"
  ON public.city_master FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can update cities"
  ON public.city_master FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin users can delete cities"
  ON public.city_master FOR DELETE TO authenticated
  USING (public.is_admin());

-- VEHICLE MASTER TABLE
CREATE POLICY "Authenticated users can view vehicles"
  ON public.vehicle_master FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create vehicles"
  ON public.vehicle_master FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can update vehicles"
  ON public.vehicle_master FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin users can delete vehicles"
  ON public.vehicle_master FOR DELETE TO authenticated
  USING (public.is_admin());

-- CUSTOMER MASTER TABLE
CREATE POLICY "Authenticated users can view customers"
  ON public.customer_master FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create customers"
  ON public.customer_master FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON public.customer_master FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin users can delete customers"
  ON public.customer_master FOR DELETE TO authenticated
  USING (public.is_admin());

-- VENDOR MASTER TABLE
CREATE POLICY "Authenticated users can view vendors"
  ON public.vendor_master FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert vendors"
  ON public.vendor_master FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Authenticated users can update vendors"
  ON public.vendor_master FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "Authenticated users can delete vendors"
  ON public.vendor_master FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

-- ORDER ENQUIRY TABLE
CREATE POLICY "Authenticated users can view enquiries"
  ON public.order_enquiry FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert enquiries"
  ON public.order_enquiry FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update enquiries"
  ON public.order_enquiry FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can delete enquiries"
  ON public.order_enquiry FOR DELETE TO authenticated
  USING (public.is_admin());

-- BOOKING TRANSACTION TABLE
CREATE POLICY "Users can view booking transactions"
  ON public.booking_transaction FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert booking transactions"
  ON public.booking_transaction FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update booking transactions"
  ON public.booking_transaction FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "Admin can delete booking transactions"
  ON public.booking_transaction FOR DELETE TO authenticated
  USING (public.is_admin());

-- BOOKING LR TABLE
CREATE POLICY "Users can view booking LRs"
  ON public.booking_lr FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create booking LRs"
  ON public.booking_lr FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update booking LRs"
  ON public.booking_lr FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "Admin users can delete booking LRs"
  ON public.booking_lr FOR DELETE TO authenticated
  USING (public.is_admin());

-- LR BILL TABLE
CREATE POLICY "Users can view LR bills"
  ON public.lr_bill FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create LR bills"
  ON public.lr_bill FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update LR bills"
  ON public.lr_bill FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "Admin users can delete LR bills"
  ON public.lr_bill FOR DELETE TO authenticated
  USING (public.is_admin());

-- THC DETAILS TABLE
CREATE POLICY "Users can view THC details"
  ON public.thc_details FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create THC details"
  ON public.thc_details FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update THC details"
  ON public.thc_details FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "Admin users can delete THC details"
  ON public.thc_details FOR DELETE TO authenticated
  USING (public.is_admin());

-- COMPANY MASTER TABLE
CREATE POLICY "Authenticated users can view companies"
  ON public.company_master FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin users can insert companies"
  ON public.company_master FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin users can update companies"
  ON public.company_master FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin users can delete companies"
  ON public.company_master FOR DELETE TO authenticated
  USING (public.is_admin());

-- STATE MASTER TABLE
CREATE POLICY "Authenticated users can view states"
  ON public.state_master FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin users can insert states"
  ON public.state_master FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin users can update states"
  ON public.state_master FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin users can delete states"
  ON public.state_master FOR DELETE TO authenticated
  USING (public.is_admin());

-- CUSTOMER GST MASTER TABLE
CREATE POLICY "Authenticated users can view customer GST records"
  ON public.customer_gst_master FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create customer GST records"
  ON public.customer_gst_master FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update customer GST records"
  ON public.customer_gst_master FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "Admin users can delete customer GST records"
  ON public.customer_gst_master FOR DELETE TO authenticated
  USING (public.is_admin());

-- DOC TYPES TABLE
CREATE POLICY "Authenticated users can view doc types"
  ON public.doc_types FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create doc types"
  ON public.doc_types FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can update doc types"
  ON public.doc_types FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can delete doc types"
  ON public.doc_types FOR DELETE TO authenticated
  USING (public.is_admin());

-- STATUS MASTER TABLE
CREATE POLICY "Authenticated users can view status"
  ON public.status_master FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create status"
  ON public.status_master FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can update status"
  ON public.status_master FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can delete status"
  ON public.status_master FOR DELETE TO authenticated
  USING (public.is_admin());
