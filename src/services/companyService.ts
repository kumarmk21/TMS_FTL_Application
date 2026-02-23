/**
 * Company Master CRUD Service
 *
 * This module provides comprehensive CRUD operations for the company_master table.
 * Database: Supabase (PostgreSQL)
 * Entity: Company Master
 *
 * Features:
 * - Create: Add new company records
 * - Read: Fetch single or multiple company records with relations
 * - Update: Modify existing company records
 * - Delete: Remove company records
 * - Validation: Input validation and error handling
 * - Relations: Includes branch, city, and state data
 */

import { supabase } from '../lib/supabase';

/**
 * Company Interface - Defines the structure of a company record
 */
export interface Company {
  id?: string;
  company_code: string;
  company_name: string;
  company_tagline?: string | null;
  company_address?: string | null;
  branch_id?: string | null;
  city_id?: string | null;
  state_id?: string | null;
  city?: string | null;
  state?: string | null;
  pin_code?: string | null;
  cin?: string | null;
  gstin?: string | null;
  pan?: string | null;
  msme_no?: string | null;
  contact_number?: string | null;
  email?: string | null;
  website?: string | null;
  logo_url?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  bank_branch?: string | null;
  bill_footer1?: string | null;
  bill_footer2?: string | null;
  bill_footer3?: string | null;
  bill_footer4?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
  branch_master?: {
    branch_name: string;
    branch_code: string | null;
  };
  city_master?: {
    city_name: string;
    state_master?: {
      state_name: string;
    };
  };
}

/**
 * Response Interface - Standard response format for CRUD operations
 */
export interface CompanyResponse<T = Company> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * List Response Interface - For list/fetch all operations
 */
export interface CompanyListResponse {
  success: boolean;
  data?: Company[];
  error?: string;
  count?: number;
}

/**
 * Validation Interface - Input validation results
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * ============================================================================
 * VALIDATION FUNCTIONS
 * ============================================================================
 */

/**
 * Validates company data before create/update operations
 * @param company - Company data to validate
 * @param isUpdate - Whether this is an update operation
 * @returns ValidationResult with isValid flag and error messages
 */
export function validateCompanyData(company: Partial<Company>, isUpdate: boolean = false): ValidationResult {
  const errors: string[] = [];

  // Required field validations
  if (!isUpdate || company.company_code !== undefined) {
    if (!company.company_code || company.company_code.trim() === '') {
      errors.push('Company code is required');
    } else if (company.company_code.length > 20) {
      errors.push('Company code must be 20 characters or less');
    }
  }

  if (!isUpdate || company.company_name !== undefined) {
    if (!company.company_name || company.company_name.trim() === '') {
      errors.push('Company name is required');
    } else if (company.company_name.length > 200) {
      errors.push('Company name must be 200 characters or less');
    }
  }

  // Optional field validations
  if (company.email && company.email.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(company.email)) {
      errors.push('Invalid email format');
    }
  }

  if (company.gstin && company.gstin.trim() !== '') {
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(company.gstin)) {
      errors.push('Invalid GSTIN format (e.g., 22AAAAA0000A1Z5)');
    }
  }

  if (company.pan && company.pan.trim() !== '') {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(company.pan)) {
      errors.push('Invalid PAN format (e.g., ABCDE1234F)');
    }
  }

  if (company.cin && company.cin.trim() !== '') {
    if (company.cin.length !== 21) {
      errors.push('CIN must be exactly 21 characters');
    }
  }

  if (company.pin_code && company.pin_code.trim() !== '') {
    const pinRegex = /^[0-9]{6}$/;
    if (!pinRegex.test(company.pin_code)) {
      errors.push('PIN code must be 6 digits');
    }
  }

  if (company.contact_number && company.contact_number.trim() !== '') {
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(company.contact_number.replace(/[\s\-\+]/g, ''))) {
      errors.push('Invalid contact number format (10-15 digits)');
    }
  }

  if (company.ifsc_code && company.ifsc_code.trim() !== '') {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(company.ifsc_code)) {
      errors.push('Invalid IFSC code format (e.g., SBIN0001234)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * ============================================================================
 * CREATE OPERATIONS
 * ============================================================================
 */

/**
 * Creates a new company record in the database
 *
 * @param company - Company data to create (without id)
 * @param userId - ID of the user creating the record
 * @returns CompanyResponse with created company data or error
 *
 * @example
 * ```typescript
 * const result = await createCompany({
 *   company_code: 'DLS001',
 *   company_name: 'DLS Logistics Pvt Ltd',
 *   email: 'info@dlslogistics.com',
 *   contact_number: '9876543210'
 * }, currentUserId);
 *
 * if (result.success) {
 *   console.log('Company created:', result.data);
 * } else {
 *   console.error('Error:', result.error);
 * }
 * ```
 */
export async function createCompany(
  company: Omit<Company, 'id' | 'created_at' | 'updated_at'>,
  userId?: string
): Promise<CompanyResponse> {
  try {
    // Validate input data
    const validation = validateCompanyData(company);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', ')
      };
    }

    // Check for duplicate company code
    const { data: existingCompany } = await supabase
      .from('company_master')
      .select('id')
      .eq('company_code', company.company_code)
      .maybeSingle();

    if (existingCompany) {
      return {
        success: false,
        error: `Company code '${company.company_code}' already exists`
      };
    }

    // Prepare data for insertion
    const insertData: any = {
      ...company,
      created_by: userId,
      updated_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert company record
    const { data, error } = await supabase
      .from('company_master')
      .insert(insertData)
      .select(`
        *,
        branch_master:branch_id (branch_name, branch_code),
        city_master:city_id (
          city_name,
          state_master:state_id (state_name)
        )
      `)
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data as Company,
      message: 'Company created successfully'
    };
  } catch (error: any) {
    console.error('Error creating company:', error);
    return {
      success: false,
      error: error.message || 'Failed to create company'
    };
  }
}

/**
 * Creates multiple company records in a single transaction
 *
 * @param companies - Array of company data to create
 * @param userId - ID of the user creating the records
 * @returns CompanyListResponse with created companies or error
 *
 * @example
 * ```typescript
 * const companies = [
 *   { company_code: 'DLS001', company_name: 'Company 1' },
 *   { company_code: 'DLS002', company_name: 'Company 2' }
 * ];
 * const result = await bulkCreateCompanies(companies, userId);
 * ```
 */
export async function bulkCreateCompanies(
  companies: Omit<Company, 'id' | 'created_at' | 'updated_at'>[],
  userId?: string
): Promise<CompanyListResponse> {
  try {
    // Validate all companies
    for (const company of companies) {
      const validation = validateCompanyData(company);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        };
      }
    }

    // Prepare data for bulk insertion
    const insertData = companies.map(company => ({
      ...company,
      created_by: userId,
      updated_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Insert all companies
    const { data, error } = await supabase
      .from('company_master')
      .insert(insertData)
      .select('*');

    if (error) throw error;

    return {
      success: true,
      data: data as Company[],
      count: data?.length || 0
    };
  } catch (error: any) {
    console.error('Error bulk creating companies:', error);
    return {
      success: false,
      error: error.message || 'Failed to create companies'
    };
  }
}

/**
 * ============================================================================
 * READ OPERATIONS
 * ============================================================================
 */

/**
 * Fetches a single company record by ID
 *
 * @param id - UUID of the company to fetch
 * @returns CompanyResponse with company data or error
 *
 * @example
 * ```typescript
 * const result = await getCompanyById('123e4567-e89b-12d3-a456-426614174000');
 * if (result.success && result.data) {
 *   console.log('Company:', result.data.company_name);
 * }
 * ```
 */
export async function getCompanyById(id: string): Promise<CompanyResponse> {
  try {
    if (!id || id.trim() === '') {
      return {
        success: false,
        error: 'Company ID is required'
      };
    }

    const { data, error } = await supabase
      .from('company_master')
      .select(`
        *,
        branch_master:branch_id (branch_name, branch_code),
        city_master:city_id (
          city_name,
          state_master:state_id (state_name)
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return {
        success: false,
        error: 'Company not found'
      };
    }

    return {
      success: true,
      data: data as Company
    };
  } catch (error: any) {
    console.error('Error fetching company:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch company'
    };
  }
}

/**
 * Fetches a company record by company code
 *
 * @param companyCode - Unique company code
 * @returns CompanyResponse with company data or error
 *
 * @example
 * ```typescript
 * const result = await getCompanyByCode('DLS001');
 * ```
 */
export async function getCompanyByCode(companyCode: string): Promise<CompanyResponse> {
  try {
    if (!companyCode || companyCode.trim() === '') {
      return {
        success: false,
        error: 'Company code is required'
      };
    }

    const { data, error } = await supabase
      .from('company_master')
      .select(`
        *,
        branch_master:branch_id (branch_name, branch_code),
        city_master:city_id (
          city_name,
          state_master:state_id (state_name)
        )
      `)
      .eq('company_code', companyCode)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return {
        success: false,
        error: 'Company not found'
      };
    }

    return {
      success: true,
      data: data as Company
    };
  } catch (error: any) {
    console.error('Error fetching company:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch company'
    };
  }
}

/**
 * Fetches all company records with optional filtering and pagination
 *
 * @param options - Query options (limit, offset, orderBy, search)
 * @returns CompanyListResponse with array of companies or error
 *
 * @example
 * ```typescript
 * // Get all companies
 * const result = await getAllCompanies();
 *
 * // Get with pagination and search
 * const result = await getAllCompanies({
 *   limit: 20,
 *   offset: 0,
 *   orderBy: 'company_name',
 *   ascending: true,
 *   searchTerm: 'logistics'
 * });
 * ```
 */
export async function getAllCompanies(options?: {
  limit?: number;
  offset?: number;
  orderBy?: string;
  ascending?: boolean;
  searchTerm?: string;
}): Promise<CompanyListResponse> {
  try {
    let query = supabase
      .from('company_master')
      .select(`
        *,
        branch_master:branch_id (branch_name, branch_code),
        city_master:city_id (
          city_name,
          state_master:state_id (state_name)
        )
      `, { count: 'exact' });

    // Apply search filter
    if (options?.searchTerm && options.searchTerm.trim() !== '') {
      const search = options.searchTerm.toLowerCase();
      query = query.or(`company_code.ilike.%${search}%,company_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply ordering
    const orderBy = options?.orderBy || 'company_code';
    const ascending = options?.ascending !== false;
    query = query.order(orderBy, { ascending });

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      success: true,
      data: (data || []) as Company[],
      count: count || 0
    };
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch companies'
    };
  }
}

/**
 * Fetches companies by branch ID
 *
 * @param branchId - UUID of the branch
 * @returns CompanyListResponse with array of companies
 *
 * @example
 * ```typescript
 * const result = await getCompaniesByBranch('branch-uuid');
 * ```
 */
export async function getCompaniesByBranch(branchId: string): Promise<CompanyListResponse> {
  try {
    if (!branchId || branchId.trim() === '') {
      return {
        success: false,
        error: 'Branch ID is required'
      };
    }

    const { data, error } = await supabase
      .from('company_master')
      .select(`
        *,
        branch_master:branch_id (branch_name, branch_code),
        city_master:city_id (
          city_name,
          state_master:state_id (state_name)
        )
      `)
      .eq('branch_id', branchId)
      .order('company_code', { ascending: true });

    if (error) throw error;

    return {
      success: true,
      data: (data || []) as Company[],
      count: data?.length || 0
    };
  } catch (error: any) {
    console.error('Error fetching companies by branch:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch companies'
    };
  }
}

/**
 * ============================================================================
 * UPDATE OPERATIONS
 * ============================================================================
 */

/**
 * Updates an existing company record
 *
 * @param id - UUID of the company to update
 * @param updates - Partial company data to update
 * @param userId - ID of the user making the update
 * @returns CompanyResponse with updated company data or error
 *
 * @example
 * ```typescript
 * const result = await updateCompany(
 *   'company-id',
 *   { company_name: 'New Name', email: 'new@email.com' },
 *   currentUserId
 * );
 *
 * if (result.success) {
 *   console.log('Updated:', result.data);
 * }
 * ```
 */
export async function updateCompany(
  id: string,
  updates: Partial<Company>,
  userId?: string
): Promise<CompanyResponse> {
  try {
    if (!id || id.trim() === '') {
      return {
        success: false,
        error: 'Company ID is required'
      };
    }

    // Validate update data
    const validation = validateCompanyData(updates, true);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', ')
      };
    }

    // Check if company exists
    const existing = await getCompanyById(id);
    if (!existing.success) {
      return existing;
    }

    // Check for duplicate company code if being updated
    if (updates.company_code && updates.company_code !== existing.data?.company_code) {
      const { data: duplicate } = await supabase
        .from('company_master')
        .select('id')
        .eq('company_code', updates.company_code)
        .neq('id', id)
        .maybeSingle();

      if (duplicate) {
        return {
          success: false,
          error: `Company code '${updates.company_code}' already exists`
        };
      }
    }

    // Prepare update data
    const updateData: any = {
      ...updates,
      updated_by: userId,
      updated_at: new Date().toISOString()
    };

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.created_by;

    // Update company record
    const { data, error } = await supabase
      .from('company_master')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        branch_master:branch_id (branch_name, branch_code),
        city_master:city_id (
          city_name,
          state_master:state_id (state_name)
        )
      `)
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data as Company,
      message: 'Company updated successfully'
    };
  } catch (error: any) {
    console.error('Error updating company:', error);
    return {
      success: false,
      error: error.message || 'Failed to update company'
    };
  }
}

/**
 * Updates multiple company records in bulk
 *
 * @param updates - Array of {id, data} objects to update
 * @param userId - ID of the user making the updates
 * @returns CompanyListResponse with updated companies or error
 *
 * @example
 * ```typescript
 * const updates = [
 *   { id: 'id1', data: { email: 'new1@email.com' } },
 *   { id: 'id2', data: { email: 'new2@email.com' } }
 * ];
 * const result = await bulkUpdateCompanies(updates, userId);
 * ```
 */
export async function bulkUpdateCompanies(
  updates: Array<{ id: string; data: Partial<Company> }>,
  userId?: string
): Promise<CompanyListResponse> {
  try {
    const results: Company[] = [];
    const errors: string[] = [];

    for (const update of updates) {
      const result = await updateCompany(update.id, update.data, userId);
      if (result.success && result.data) {
        results.push(result.data);
      } else {
        errors.push(`Failed to update ${update.id}: ${result.error}`);
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: errors.join('; '),
        data: results,
        count: results.length
      };
    }

    return {
      success: true,
      data: results,
      count: results.length
    };
  } catch (error: any) {
    console.error('Error bulk updating companies:', error);
    return {
      success: false,
      error: error.message || 'Failed to update companies'
    };
  }
}

/**
 * ============================================================================
 * DELETE OPERATIONS
 * ============================================================================
 */

/**
 * Deletes a company record by ID
 *
 * @param id - UUID of the company to delete
 * @returns CompanyResponse with success status or error
 *
 * @example
 * ```typescript
 * const result = await deleteCompany('company-id');
 * if (result.success) {
 *   console.log('Company deleted successfully');
 * }
 * ```
 */
export async function deleteCompany(id: string): Promise<CompanyResponse> {
  try {
    if (!id || id.trim() === '') {
      return {
        success: false,
        error: 'Company ID is required'
      };
    }

    // Check if company exists
    const existing = await getCompanyById(id);
    if (!existing.success) {
      return {
        success: false,
        error: 'Company not found'
      };
    }

    // Delete company record
    const { error } = await supabase
      .from('company_master')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return {
      success: true,
      message: 'Company deleted successfully'
    };
  } catch (error: any) {
    console.error('Error deleting company:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete company'
    };
  }
}

/**
 * Deletes multiple company records in bulk
 *
 * @param ids - Array of company IDs to delete
 * @returns CompanyResponse with success status or error
 *
 * @example
 * ```typescript
 * const result = await bulkDeleteCompanies(['id1', 'id2', 'id3']);
 * ```
 */
export async function bulkDeleteCompanies(ids: string[]): Promise<CompanyResponse> {
  try {
    if (!ids || ids.length === 0) {
      return {
        success: false,
        error: 'At least one company ID is required'
      };
    }

    const { error } = await supabase
      .from('company_master')
      .delete()
      .in('id', ids);

    if (error) throw error;

    return {
      success: true,
      message: `${ids.length} companies deleted successfully`
    };
  } catch (error: any) {
    console.error('Error bulk deleting companies:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete companies'
    };
  }
}

/**
 * Soft delete - marks a company as inactive (if you have an is_active column)
 * Note: This requires an 'is_active' column in your database schema
 *
 * @param id - UUID of the company to soft delete
 * @param userId - ID of the user performing the action
 * @returns CompanyResponse with success status or error
 */
export async function softDeleteCompany(id: string, userId?: string): Promise<CompanyResponse> {
  try {
    // Note: This requires adding an 'is_active' column to company_master table
    const result = await updateCompany(
      id,
      { updated_by: userId } as any, // You would add is_active: false here
      userId
    );

    if (result.success) {
      return {
        success: true,
        message: 'Company deactivated successfully'
      };
    }

    return result;
  } catch (error: any) {
    console.error('Error soft deleting company:', error);
    return {
      success: false,
      error: error.message || 'Failed to deactivate company'
    };
  }
}

/**
 * ============================================================================
 * UTILITY FUNCTIONS
 * ============================================================================
 */

/**
 * Checks if a company code already exists
 *
 * @param companyCode - Company code to check
 * @param excludeId - Optional ID to exclude from check (for updates)
 * @returns Boolean indicating if code exists
 *
 * @example
 * ```typescript
 * const exists = await companyCodeExists('DLS001');
 * if (exists) {
 *   console.log('Code already in use');
 * }
 * ```
 */
export async function companyCodeExists(companyCode: string, excludeId?: string): Promise<boolean> {
  try {
    let query = supabase
      .from('company_master')
      .select('id')
      .eq('company_code', companyCode);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data } = await query.maybeSingle();
    return !!data;
  } catch (error) {
    console.error('Error checking company code:', error);
    return false;
  }
}

/**
 * Gets total count of companies
 *
 * @returns Number of total companies
 */
export async function getCompanyCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('company_master')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting company count:', error);
    return 0;
  }
}

/**
 * Searches companies by name or code
 *
 * @param searchTerm - Search term
 * @param limit - Maximum number of results
 * @returns CompanyListResponse with matching companies
 */
export async function searchCompanies(searchTerm: string, limit: number = 50): Promise<CompanyListResponse> {
  return getAllCompanies({
    searchTerm,
    limit,
    orderBy: 'company_name',
    ascending: true
  });
}
