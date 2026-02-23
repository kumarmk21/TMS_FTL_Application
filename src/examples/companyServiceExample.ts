/**
 * Company Service - Usage Examples
 *
 * This file demonstrates how to use all CRUD operations from the companyService
 * Copy and adapt these examples for your specific use cases
 */

import {
  createCompany,
  bulkCreateCompanies,
  getCompanyById,
  getCompanyByCode,
  getAllCompanies,
  getCompaniesByBranch,
  updateCompany,
  bulkUpdateCompanies,
  deleteCompany,
  bulkDeleteCompanies,
  searchCompanies,
  companyCodeExists,
  getCompanyCount,
  Company
} from '../services/companyService';

/**
 * ============================================================================
 * CREATE EXAMPLES
 * ============================================================================
 */

/**
 * Example 1: Create a new company with minimal required fields
 */
export async function exampleCreateBasicCompany() {
  const currentUserId = 'user-uuid-here'; // Get from auth context

  const result = await createCompany({
    company_code: 'DLS001',
    company_name: 'DLS Logistics Private Limited'
  }, currentUserId);

  if (result.success) {
    console.log('Company created successfully:', result.data);
    console.log('Company ID:', result.data?.id);
  } else {
    console.error('Failed to create company:', result.error);
  }
}

/**
 * Example 2: Create a company with complete details
 */
export async function exampleCreateCompleteCompany() {
  const currentUserId = 'user-uuid-here';

  const result = await createCompany({
    company_code: 'DLS002',
    company_name: 'DLS Logistics Private Limited',
    company_tagline: 'Your Trusted Logistics Partner',
    company_address: '123 Business Park, Industrial Area',
    city: 'Mumbai',
    state: 'Maharashtra',
    pin_code: '400001',
    cin: 'U63000MH2020PTC123456',
    gstin: '27AAAAA0000A1Z5',
    pan: 'AAAAA0000A',
    msme_no: 'UDYAM-MH-01-0000001',
    contact_number: '9876543210',
    email: 'info@dlslogistics.com',
    website: 'https://www.dlslogistics.com',
    bank_name: 'HDFC Bank',
    account_number: '12345678901234',
    ifsc_code: 'HDFC0001234',
    bank_branch: 'Mumbai Main Branch',
    bill_footer1: 'Thank you for your business',
    bill_footer2: 'Terms & Conditions Apply',
    bill_footer3: 'Subject to Mumbai Jurisdiction',
    bill_footer4: 'E. & O. E.'
  }, currentUserId);

  if (result.success) {
    console.log('Company created:', result.data?.company_name);
  } else {
    console.error('Error:', result.error);
  }
}

/**
 * Example 3: Create company with branch and city relations
 */
export async function exampleCreateCompanyWithRelations() {
  const currentUserId = 'user-uuid-here';

  const result = await createCompany({
    company_code: 'DLS003',
    company_name: 'DLS Express',
    branch_id: 'branch-uuid-here', // Reference to branch_master
    city_id: 'city-uuid-here',     // Reference to city_master
    state_id: 'state-uuid-here',   // Reference to state_master
    contact_number: '9876543210',
    email: 'express@dls.com'
  }, currentUserId);

  if (result.success && result.data) {
    console.log('Company:', result.data.company_name);
    console.log('Branch:', result.data.branch_master?.branch_name);
    console.log('City:', result.data.city_master?.city_name);
    console.log('State:', result.data.city_master?.state_master?.state_name);
  }
}

/**
 * Example 4: Bulk create multiple companies
 */
export async function exampleBulkCreateCompanies() {
  const currentUserId = 'user-uuid-here';

  const companies = [
    {
      company_code: 'DLS010',
      company_name: 'DLS North Region',
      email: 'north@dls.com'
    },
    {
      company_code: 'DLS011',
      company_name: 'DLS South Region',
      email: 'south@dls.com'
    },
    {
      company_code: 'DLS012',
      company_name: 'DLS East Region',
      email: 'east@dls.com'
    }
  ];

  const result = await bulkCreateCompanies(companies, currentUserId);

  if (result.success) {
    console.log(`${result.count} companies created successfully`);
    result.data?.forEach(company => {
      console.log(`- ${company.company_code}: ${company.company_name}`);
    });
  } else {
    console.error('Bulk create failed:', result.error);
  }
}

/**
 * ============================================================================
 * READ EXAMPLES
 * ============================================================================
 */

/**
 * Example 5: Get company by ID
 */
export async function exampleGetCompanyById() {
  const companyId = '123e4567-e89b-12d3-a456-426614174000';

  const result = await getCompanyById(companyId);

  if (result.success && result.data) {
    const company = result.data;
    console.log('Company Details:');
    console.log('Code:', company.company_code);
    console.log('Name:', company.company_name);
    console.log('Email:', company.email);
    console.log('Contact:', company.contact_number);
    console.log('GSTIN:', company.gstin);
    console.log('Branch:', company.branch_master?.branch_name);
  } else {
    console.error('Company not found:', result.error);
  }
}

/**
 * Example 6: Get company by code
 */
export async function exampleGetCompanyByCode() {
  const result = await getCompanyByCode('DLS001');

  if (result.success && result.data) {
    console.log('Found company:', result.data.company_name);
  } else {
    console.error('Company not found');
  }
}

/**
 * Example 7: Get all companies (no filters)
 */
export async function exampleGetAllCompanies() {
  const result = await getAllCompanies();

  if (result.success && result.data) {
    console.log(`Total companies: ${result.count}`);
    result.data.forEach((company, index) => {
      console.log(`${index + 1}. ${company.company_code} - ${company.company_name}`);
    });
  }
}

/**
 * Example 8: Get companies with pagination
 */
export async function exampleGetCompaniesWithPagination() {
  const page = 1;
  const pageSize = 10;

  const result = await getAllCompanies({
    limit: pageSize,
    offset: (page - 1) * pageSize,
    orderBy: 'company_name',
    ascending: true
  });

  if (result.success) {
    console.log(`Page ${page} of ${Math.ceil((result.count || 0) / pageSize)}`);
    console.log(`Showing ${result.data?.length} of ${result.count} companies`);

    result.data?.forEach((company, index) => {
      console.log(`${(page - 1) * pageSize + index + 1}. ${company.company_name}`);
    });
  }
}

/**
 * Example 9: Search companies
 */
export async function exampleSearchCompanies() {
  const searchTerm = 'logistics';

  const result = await searchCompanies(searchTerm, 20);

  if (result.success && result.data) {
    console.log(`Found ${result.data.length} companies matching "${searchTerm}"`);
    result.data.forEach(company => {
      console.log(`- ${company.company_code}: ${company.company_name}`);
    });
  }
}

/**
 * Example 10: Get companies by branch
 */
export async function exampleGetCompaniesByBranch() {
  const branchId = 'branch-uuid-here';

  const result = await getCompaniesByBranch(branchId);

  if (result.success && result.data) {
    console.log(`Companies in branch: ${result.count}`);
    result.data.forEach(company => {
      console.log(`- ${company.company_name}`);
    });
  }
}

/**
 * Example 11: Get companies with advanced filtering
 */
export async function exampleAdvancedFiltering() {
  // Get all companies sorted by name, limited to 50
  const result = await getAllCompanies({
    limit: 50,
    orderBy: 'company_name',
    ascending: true,
    searchTerm: 'DLS'
  });

  if (result.success) {
    console.log('Filtered companies:', result.data?.length);
  }
}

/**
 * ============================================================================
 * UPDATE EXAMPLES
 * ============================================================================
 */

/**
 * Example 12: Update a single field
 */
export async function exampleUpdateSingleField() {
  const companyId = 'company-uuid-here';
  const currentUserId = 'user-uuid-here';

  const result = await updateCompany(
    companyId,
    { email: 'newemail@dls.com' },
    currentUserId
  );

  if (result.success) {
    console.log('Email updated successfully');
  } else {
    console.error('Update failed:', result.error);
  }
}

/**
 * Example 13: Update multiple fields
 */
export async function exampleUpdateMultipleFields() {
  const companyId = 'company-uuid-here';
  const currentUserId = 'user-uuid-here';

  const result = await updateCompany(
    companyId,
    {
      company_name: 'Updated Company Name',
      email: 'updated@email.com',
      contact_number: '9999999999',
      website: 'https://www.newwebsite.com'
    },
    currentUserId
  );

  if (result.success && result.data) {
    console.log('Company updated:', result.data.company_name);
    console.log('Updated at:', result.data.updated_at);
  }
}

/**
 * Example 14: Update company address
 */
export async function exampleUpdateAddress() {
  const companyId = 'company-uuid-here';
  const currentUserId = 'user-uuid-here';

  const result = await updateCompany(
    companyId,
    {
      company_address: 'New Address Line 1, Area Name',
      city: 'New City',
      state: 'New State',
      pin_code: '400002'
    },
    currentUserId
  );

  if (result.success) {
    console.log('Address updated successfully');
  }
}

/**
 * Example 15: Bulk update companies
 */
export async function exampleBulkUpdateCompanies() {
  const currentUserId = 'user-uuid-here';

  const updates = [
    {
      id: 'company-id-1',
      data: { website: 'https://www.company1.com' }
    },
    {
      id: 'company-id-2',
      data: { website: 'https://www.company2.com' }
    },
    {
      id: 'company-id-3',
      data: { website: 'https://www.company3.com' }
    }
  ];

  const result = await bulkUpdateCompanies(updates, currentUserId);

  if (result.success) {
    console.log(`${result.count} companies updated successfully`);
  } else {
    console.error('Bulk update errors:', result.error);
  }
}

/**
 * ============================================================================
 * DELETE EXAMPLES
 * ============================================================================
 */

/**
 * Example 16: Delete a single company
 */
export async function exampleDeleteCompany() {
  const companyId = 'company-uuid-here';

  // Confirm before deleting
  const confirmDelete = confirm('Are you sure you want to delete this company?');

  if (confirmDelete) {
    const result = await deleteCompany(companyId);

    if (result.success) {
      console.log('Company deleted successfully');
    } else {
      console.error('Delete failed:', result.error);
    }
  }
}

/**
 * Example 17: Bulk delete companies
 */
export async function exampleBulkDeleteCompanies() {
  const companyIds = [
    'company-id-1',
    'company-id-2',
    'company-id-3'
  ];

  const result = await bulkDeleteCompanies(companyIds);

  if (result.success) {
    console.log(result.message);
  } else {
    console.error('Bulk delete failed:', result.error);
  }
}

/**
 * ============================================================================
 * UTILITY EXAMPLES
 * ============================================================================
 */

/**
 * Example 18: Check if company code exists
 */
export async function exampleCheckCompanyCodeExists() {
  const codeToCheck = 'DLS001';

  const exists = await companyCodeExists(codeToCheck);

  if (exists) {
    console.log(`Company code '${codeToCheck}' is already in use`);
  } else {
    console.log(`Company code '${codeToCheck}' is available`);
  }
}

/**
 * Example 19: Get total company count
 */
export async function exampleGetCompanyCount() {
  const count = await getCompanyCount();
  console.log(`Total companies in database: ${count}`);
}

/**
 * Example 20: Check code availability for update
 */
export async function exampleCheckCodeForUpdate() {
  const newCode = 'DLS999';
  const currentCompanyId = 'company-uuid-here';

  // Check if code exists, excluding current company
  const exists = await companyCodeExists(newCode, currentCompanyId);

  if (exists) {
    console.log('Code already in use by another company');
  } else {
    console.log('Code available for update');
  }
}

/**
 * ============================================================================
 * COMPLETE WORKFLOW EXAMPLES
 * ============================================================================
 */

/**
 * Example 21: Complete CRUD workflow
 */
export async function exampleCompleteCRUDWorkflow() {
  const currentUserId = 'user-uuid-here';

  console.log('=== CREATE ===');
  // Create
  const createResult = await createCompany({
    company_code: 'TEST001',
    company_name: 'Test Company',
    email: 'test@company.com'
  }, currentUserId);

  if (!createResult.success || !createResult.data) {
    console.error('Create failed:', createResult.error);
    return;
  }

  const companyId = createResult.data.id!;
  console.log('Created company with ID:', companyId);

  console.log('\n=== READ ===');
  // Read
  const readResult = await getCompanyById(companyId);
  if (readResult.success && readResult.data) {
    console.log('Company details:', readResult.data);
  }

  console.log('\n=== UPDATE ===');
  // Update
  const updateResult = await updateCompany(
    companyId,
    {
      email: 'updated@company.com',
      contact_number: '9999999999'
    },
    currentUserId
  );
  if (updateResult.success) {
    console.log('Company updated successfully');
  }

  console.log('\n=== DELETE ===');
  // Delete
  const deleteResult = await deleteCompany(companyId);
  if (deleteResult.success) {
    console.log('Company deleted successfully');
  }
}

/**
 * Example 22: Form submission handler
 */
export async function exampleFormSubmissionHandler(formData: any, isEdit: boolean) {
  const currentUserId = 'user-uuid-here'; // Get from auth context

  if (isEdit) {
    // Update existing company
    const result = await updateCompany(
      formData.id,
      {
        company_name: formData.company_name,
        email: formData.email,
        contact_number: formData.contact_number,
        company_address: formData.company_address,
        city: formData.city,
        state: formData.state,
        pin_code: formData.pin_code
      },
      currentUserId
    );

    return result;
  } else {
    // Create new company
    const result = await createCompany(
      {
        company_code: formData.company_code,
        company_name: formData.company_name,
        email: formData.email,
        contact_number: formData.contact_number,
        company_address: formData.company_address,
        city: formData.city,
        state: formData.state,
        pin_code: formData.pin_code
      },
      currentUserId
    );

    return result;
  }
}

/**
 * Example 23: Error handling pattern
 */
export async function exampleErrorHandlingPattern() {
  try {
    const result = await createCompany({
      company_code: 'DLS999',
      company_name: 'Test Company'
    });

    if (result.success) {
      // Handle success
      console.log('Success:', result.message);
      console.log('Data:', result.data);
    } else {
      // Handle validation or business logic errors
      console.error('Error:', result.error);
      // Show user-friendly error message
      alert(`Failed to create company: ${result.error}`);
    }
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error:', error);
    alert('An unexpected error occurred. Please try again.');
  }
}

/**
 * Example 24: Using with React component
 */
export function exampleReactComponent() {
  /*
  import { useState, useEffect } from 'react';
  import { getAllCompanies, createCompany, updateCompany, deleteCompany } from '../services/companyService';
  import { useAuth } from '../contexts/AuthContext';

  function CompanyList() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
      loadCompanies();
    }, []);

    const loadCompanies = async () => {
      setLoading(true);
      const result = await getAllCompanies({
        orderBy: 'company_name',
        ascending: true
      });

      if (result.success && result.data) {
        setCompanies(result.data);
      }
      setLoading(false);
    };

    const handleCreate = async (data) => {
      const result = await createCompany(data, user.id);
      if (result.success) {
        alert('Company created!');
        loadCompanies();
      } else {
        alert(result.error);
      }
    };

    const handleUpdate = async (id, data) => {
      const result = await updateCompany(id, data, user.id);
      if (result.success) {
        alert('Company updated!');
        loadCompanies();
      } else {
        alert(result.error);
      }
    };

    const handleDelete = async (id) => {
      if (confirm('Delete this company?')) {
        const result = await deleteCompany(id);
        if (result.success) {
          alert('Company deleted!');
          loadCompanies();
        } else {
          alert(result.error);
        }
      }
    };

    return (
      <div>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <ul>
            {companies.map(company => (
              <li key={company.id}>
                {company.company_name}
                <button onClick={() => handleUpdate(company.id, {...})}>Edit</button>
                <button onClick={() => handleDelete(company.id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  */
}

/**
 * Export all examples for easy access
 */
export const examples = {
  create: {
    basic: exampleCreateBasicCompany,
    complete: exampleCreateCompleteCompany,
    withRelations: exampleCreateCompanyWithRelations,
    bulk: exampleBulkCreateCompanies
  },
  read: {
    byId: exampleGetCompanyById,
    byCode: exampleGetCompanyByCode,
    all: exampleGetAllCompanies,
    paginated: exampleGetCompaniesWithPagination,
    search: exampleSearchCompanies,
    byBranch: exampleGetCompaniesByBranch,
    advanced: exampleAdvancedFiltering
  },
  update: {
    singleField: exampleUpdateSingleField,
    multipleFields: exampleUpdateMultipleFields,
    address: exampleUpdateAddress,
    bulk: exampleBulkUpdateCompanies
  },
  delete: {
    single: exampleDeleteCompany,
    bulk: exampleBulkDeleteCompanies
  },
  utilities: {
    checkExists: exampleCheckCompanyCodeExists,
    getCount: exampleGetCompanyCount,
    checkForUpdate: exampleCheckCodeForUpdate
  },
  workflows: {
    completeCRUD: exampleCompleteCRUDWorkflow,
    formHandler: exampleFormSubmissionHandler,
    errorHandling: exampleErrorHandlingPattern
  }
};
