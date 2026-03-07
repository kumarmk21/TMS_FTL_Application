/*
  # Security Fixes Part 1: Foreign Key Indexes

  1. Foreign Key Indexes
    - Add indexes for all unindexed foreign keys to improve query performance
    - Covers account_group, accounts_master, admin_expenses_transaction, lr_bill
*/

-- =====================================================
-- ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

-- Account Group
CREATE INDEX IF NOT EXISTS idx_account_group_created_by_fk ON public.account_group(created_by);

-- Accounts Master
CREATE INDEX IF NOT EXISTS idx_accounts_master_created_by_fk ON public.accounts_master(created_by);

-- Admin Expenses Transaction
CREATE INDEX IF NOT EXISTS idx_admin_expenses_account_group_id_fk ON public.admin_expenses_transaction(account_group_id);
CREATE INDEX IF NOT EXISTS idx_admin_expenses_cancelled_by_fk ON public.admin_expenses_transaction(cancelled_by);
CREATE INDEX IF NOT EXISTS idx_admin_expenses_created_by_fk ON public.admin_expenses_transaction(created_by);

-- LR Bill
CREATE INDEX IF NOT EXISTS idx_lr_bill_cancelled_by_fk ON public.lr_bill(cancelled_by);
CREATE INDEX IF NOT EXISTS idx_lr_bill_original_bill_id_fk ON public.lr_bill(original_bill_id);