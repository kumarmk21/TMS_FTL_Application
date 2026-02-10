/*
  # Fix Security and Performance Issues - Part 1
  
  1. Performance Improvements
    - Add missing indexes on foreign key columns
  
  2. Security Improvements
    - Set search_path on functions for security
*/

-- =====================================================
-- Add Missing Indexes on Foreign Keys
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_customer_master_created_by_fk 
  ON customer_master(created_by);

CREATE INDEX IF NOT EXISTS idx_customer_rate_master_branch_id_fk 
  ON customer_rate_master(branch_id);

CREATE INDEX IF NOT EXISTS idx_customer_rate_master_created_by_fk 
  ON customer_rate_master(created_by);

CREATE INDEX IF NOT EXISTS idx_customer_rate_master_updated_by_fk 
  ON customer_rate_master(updated_by);

CREATE INDEX IF NOT EXISTS idx_sac_code_master_created_by_fk 
  ON sac_code_master(created_by);

CREATE INDEX IF NOT EXISTS idx_warehouse_bill_created_by_fk 
  ON warehouse_bill(created_by);

CREATE INDEX IF NOT EXISTS idx_warehouse_bill_service_branch_id_fk 
  ON warehouse_bill(service_branch_id);

-- =====================================================
-- Fix Function Search Paths
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_thc_id') THEN
    ALTER FUNCTION generate_thc_id() SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_warehouse_bill_updated_at') THEN
    ALTER FUNCTION update_warehouse_bill_updated_at() SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_ft_config_updated_at') THEN
    ALTER FUNCTION update_ft_config_updated_at() SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_ft_trips_updated_at') THEN
    ALTER FUNCTION update_ft_trips_updated_at() SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_ath_voucher_no') THEN
    ALTER FUNCTION generate_ath_voucher_no() SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_warehouse_bill_number') THEN
    ALTER FUNCTION generate_warehouse_bill_number() SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_lr_number') THEN
    ALTER FUNCTION generate_lr_number() SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_customer_rate_master_updated_at') THEN
    ALTER FUNCTION update_customer_rate_master_updated_at() SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_populate_lr_number') THEN
    ALTER FUNCTION auto_populate_lr_number() SET search_path = public, pg_temp;
  END IF;
END $$;
