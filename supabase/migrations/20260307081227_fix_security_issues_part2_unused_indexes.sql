/*
  # Security Fixes Part 2: Remove Unused Indexes

  1. Unused Indexes Cleanup
    - Remove all unused indexes that are not being utilized
    - Reduces storage overhead and maintenance burden
*/

-- =====================================================
-- REMOVE UNUSED INDEXES
-- =====================================================

-- Profiles
DROP INDEX IF EXISTS idx_profiles_branch_code;

-- Admin Expenses Transaction
DROP INDEX IF EXISTS idx_admin_expenses_voucher;
DROP INDEX IF EXISTS idx_admin_expenses_date;
DROP INDEX IF EXISTS idx_admin_expenses_account;
DROP INDEX IF EXISTS idx_admin_expenses_branch;
DROP INDEX IF EXISTS idx_admin_expenses_vendor;

-- Order Enquiry
DROP INDEX IF EXISTS idx_order_enquiry_created_by;
DROP INDEX IF EXISTS idx_order_enquiry_vendor_id;
DROP INDEX IF EXISTS idx_order_enquiry_updated_at;
DROP INDEX IF EXISTS idx_order_enquiry_customer_id;
DROP INDEX IF EXISTS idx_order_enquiry_loading_date;
DROP INDEX IF EXISTS idx_order_enquiry_status;
DROP INDEX IF EXISTS idx_order_enquiry_lr_number;
DROP INDEX IF EXISTS idx_order_enquiry_destination_id;
DROP INDEX IF EXISTS idx_order_enquiry_origin_id;
DROP INDEX IF EXISTS idx_order_enquiry_updated_by;
DROP INDEX IF EXISTS idx_order_enquiry_vehicle_type_id;

-- State Master
DROP INDEX IF EXISTS idx_state_master_state_name;

-- Booking Transaction
DROP INDEX IF EXISTS idx_booking_transaction_tran_id;
DROP INDEX IF EXISTS idx_booking_transaction_manual_lr_no;
DROP INDEX IF EXISTS idx_booking_transaction_entry_date;
DROP INDEX IF EXISTS idx_booking_transaction_created_by;

-- Company Master
DROP INDEX IF EXISTS idx_company_master_company_code;
DROP INDEX IF EXISTS idx_company_master_company_name;
DROP INDEX IF EXISTS idx_company_master_branch_id;
DROP INDEX IF EXISTS idx_company_master_city_id;
DROP INDEX IF EXISTS idx_company_master_state_id;
DROP INDEX IF EXISTS idx_company_master_created_by;
DROP INDEX IF EXISTS idx_company_master_updated_by;

-- THC Details
DROP INDEX IF EXISTS idx_thc_details_thc_number;
DROP INDEX IF EXISTS idx_thc_details_vendor;
DROP INDEX IF EXISTS idx_thc_details_created_by;
DROP INDEX IF EXISTS idx_thc_details_thc_id_number;
DROP INDEX IF EXISTS idx_thc_details_status_ops;

-- City Master
DROP INDEX IF EXISTS idx_city_master_state_id;

-- Customer GST Master
DROP INDEX IF EXISTS idx_customer_gst_master_state_id;
DROP INDEX IF EXISTS idx_customer_gst_master_created_by;

-- Doc Types
DROP INDEX IF EXISTS idx_doc_types_created_by;

-- SAC Code Master
DROP INDEX IF EXISTS idx_sac_code_master_sac_code;
DROP INDEX IF EXISTS idx_sac_code_master_is_active;
DROP INDEX IF EXISTS idx_sac_code_master_created_by_fk;

-- LR Bill
DROP INDEX IF EXISTS idx_lr_bill_sac_code;
DROP INDEX IF EXISTS idx_lr_bill_cancelled_at;
DROP INDEX IF EXISTS idx_lr_bill_tran_id;
DROP INDEX IF EXISTS idx_lr_bill_status;
DROP INDEX IF EXISTS idx_lr_bill_created_at;
DROP INDEX IF EXISTS idx_lr_bill_generation_branch;
DROP INDEX IF EXISTS idx_lr_bill_created_by;

-- Customer Master
DROP INDEX IF EXISTS idx_customer_master_created_by_fk;

-- Vendor Master
DROP INDEX IF EXISTS idx_vendor_master_is_active;
DROP INDEX IF EXISTS idx_vendor_master_created_by;
DROP INDEX IF EXISTS idx_vendor_master_ven_bk_branch;

-- Booking LR
DROP INDEX IF EXISTS idx_booking_lr_booking_branch;
DROP INDEX IF EXISTS idx_booking_lr_enquiry_id;
DROP INDEX IF EXISTS idx_booking_lr_origin_id;
DROP INDEX IF EXISTS idx_booking_lr_destination_id;
DROP INDEX IF EXISTS idx_booking_lr_bill_date;
DROP INDEX IF EXISTS idx_booking_lr_bill_due_date;
DROP INDEX IF EXISTS idx_booking_lr_billing_party_id;
DROP INDEX IF EXISTS idx_booking_lr_created_by;

-- Status Master
DROP INDEX IF EXISTS idx_status_master_status_type;
DROP INDEX IF EXISTS idx_status_master_created_by;

-- Account Group
DROP INDEX IF EXISTS idx_account_group_code;
DROP INDEX IF EXISTS idx_account_group_parent;

-- Accounts Master
DROP INDEX IF EXISTS idx_accounts_master_code;
DROP INDEX IF EXISTS idx_accounts_master_group;

-- Customer Rate Master
DROP INDEX IF EXISTS idx_customer_rate_master_branch_id_fk;
DROP INDEX IF EXISTS idx_customer_rate_master_created_by_fk;
DROP INDEX IF EXISTS idx_customer_rate_master_updated_by_fk;
DROP INDEX IF EXISTS idx_customer_rate_customer_id;
DROP INDEX IF EXISTS idx_customer_rate_customer_master_id;
DROP INDEX IF EXISTS idx_customer_rate_from_city_id;
DROP INDEX IF EXISTS idx_customer_rate_to_city_id;
DROP INDEX IF EXISTS idx_customer_rate_vehicle_type_id;
DROP INDEX IF EXISTS idx_customer_rate_is_active;
DROP INDEX IF EXISTS idx_customer_rate_service_type;
DROP INDEX IF EXISTS idx_customer_rate_effective_dates;
DROP INDEX IF EXISTS idx_customer_rate_lookup;

-- Warehouse Bill
DROP INDEX IF EXISTS idx_warehouse_bill_number;
DROP INDEX IF EXISTS idx_warehouse_bill_party_code;
DROP INDEX IF EXISTS idx_warehouse_bill_generation_branch;
DROP INDEX IF EXISTS idx_warehouse_bill_status;
DROP INDEX IF EXISTS idx_warehouse_bill_created_at;
DROP INDEX IF EXISTS idx_warehouse_bill_party_id;
DROP INDEX IF EXISTS idx_warehouse_bill_created_by_fk;
DROP INDEX IF EXISTS idx_warehouse_bill_service_branch_id_fk;

-- Freight Tiger
DROP INDEX IF EXISTS idx_ft_trips_driver_number;
DROP INDEX IF EXISTS idx_ft_trips_vehicle_number;
DROP INDEX IF EXISTS idx_ft_trips_trip_id;

-- Vehicle Locations
DROP INDEX IF EXISTS idx_vehicle_loc_vehicle_number;
DROP INDEX IF EXISTS idx_vehicle_loc_lr_id;