# Company Master CRUD Service - Complete Documentation

## Overview

A comprehensive, production-ready CRUD (Create, Read, Update, Delete) service for the **Company Master** entity using **TypeScript** with **Supabase PostgreSQL** database.

## Technology Stack

- **Language**: TypeScript/JavaScript
- **Database**: Supabase (PostgreSQL)
- **ORM/Client**: Supabase Client Library
- **Entity**: Company Master (`company_master` table)

## File Structure

```
src/
├── services/
│   └── companyService.ts           # Main CRUD service
├── examples/
│   └── companyServiceExample.ts    # Usage examples
└── lib/
    └── supabase.ts                 # Supabase client configuration
```

## Features

### ✅ Create Operations
- Single company creation with validation
- Bulk company creation
- Duplicate code detection
- Automatic timestamp management
- User tracking (created_by, updated_by)

### ✅ Read Operations
- Get company by ID
- Get company by code
- Get all companies with pagination
- Advanced search and filtering
- Get companies by branch
- Include related data (branch, city, state)

### ✅ Update Operations
- Single field updates
- Multiple field updates
- Bulk updates
- Validation on update
- Duplicate code checking
- Automatic updated_at timestamp

### ✅ Delete Operations
- Single company deletion
- Bulk deletion
- Soft delete support (optional)
- Existence verification before delete

### ✅ Validation
- Required field validation
- Email format validation
- GSTIN format validation (Indian GST number)
- PAN format validation (Indian PAN card)
- CIN format validation (Company Identification Number)
- PIN code validation (6 digits)
- IFSC code validation (Bank identifier)
- Phone number validation

### ✅ Error Handling
- Comprehensive try-catch blocks
- Descriptive error messages
- Validation error reporting
- Database error handling
- Network error handling

### ✅ Utility Functions
- Check company code existence
- Get total company count
- Search companies by name/code
- Export/import ready

## Database Schema

### company_master Table

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID | Yes | Primary key (auto-generated) |
| company_code | TEXT | Yes | Unique company identifier |
| company_name | TEXT | Yes | Company name |
| company_tagline | TEXT | No | Company tagline/slogan |
| company_address | TEXT | No | Street address |
| branch_id | UUID | No | FK to branch_master |
| city_id | UUID | No | FK to city_master |
| state_id | UUID | No | FK to state_master |
| city | TEXT | No | City name (legacy) |
| state | TEXT | No | State name (legacy) |
| pin_code | TEXT | No | PIN/ZIP code |
| cin | TEXT | No | Company Identification Number |
| gstin | TEXT | No | GST Identification Number |
| pan | TEXT | No | PAN card number |
| msme_no | TEXT | No | MSME registration number |
| contact_number | TEXT | No | Primary contact number |
| email | TEXT | No | Primary email address |
| website | TEXT | No | Company website URL |
| logo_url | TEXT | No | Company logo URL |
| bank_name | TEXT | No | Bank name |
| account_number | TEXT | No | Bank account number |
| ifsc_code | TEXT | No | Bank IFSC code |
| bank_branch | TEXT | No | Bank branch name |
| bill_footer1-4 | TEXT | No | Bill footer lines |
| created_at | TIMESTAMP | Auto | Record creation timestamp |
| updated_at | TIMESTAMP | Auto | Last update timestamp |
| created_by | UUID | No | User who created record |
| updated_by | UUID | No | User who last updated |

## Installation & Setup

### 1. Dependencies

Already included in your project:
```json
{
  "@supabase/supabase-js": "^2.57.4"
}
```

### 2. Import the Service

```typescript
import {
  createCompany,
  getAllCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  // ... other functions
} from './services/companyService';
```

## Usage Guide

### CREATE Operations

#### Basic Create
```typescript
import { createCompany } from './services/companyService';
import { useAuth } from './contexts/AuthContext';

const { user } = useAuth();

const result = await createCompany({
  company_code: 'DLS001',
  company_name: 'DLS Logistics Private Limited',
  email: 'info@dlslogistics.com',
  contact_number: '9876543210'
}, user.id);

if (result.success) {
  console.log('Company created:', result.data);
  alert(result.message); // "Company created successfully"
} else {
  console.error('Error:', result.error);
  alert(result.error);
}
```

#### Complete Create with All Fields
```typescript
const result = await createCompany({
  company_code: 'DLS002',
  company_name: 'DLS Express Services',
  company_tagline: 'Your Trusted Partner',
  company_address: '123 Industrial Area',
  branch_id: branchUuid,
  city_id: cityUuid,
  state_id: stateUuid,
  pin_code: '400001',
  cin: 'U63000MH2020PTC123456',
  gstin: '27AAAAA0000A1Z5',
  pan: 'AAAAA0000A',
  msme_no: 'UDYAM-MH-01-0000001',
  contact_number: '9876543210',
  email: 'contact@dls.com',
  website: 'https://www.dls.com',
  bank_name: 'HDFC Bank',
  account_number: '12345678901234',
  ifsc_code: 'HDFC0001234',
  bank_branch: 'Mumbai Main',
  bill_footer1: 'Thank you for your business',
  bill_footer2: 'Terms & Conditions Apply'
}, user.id);
```

#### Bulk Create
```typescript
import { bulkCreateCompanies } from './services/companyService';

const companies = [
  { company_code: 'DLS010', company_name: 'DLS North' },
  { company_code: 'DLS011', company_name: 'DLS South' },
  { company_code: 'DLS012', company_name: 'DLS East' }
];

const result = await bulkCreateCompanies(companies, user.id);

if (result.success) {
  console.log(`${result.count} companies created`);
}
```

### READ Operations

#### Get by ID
```typescript
import { getCompanyById } from './services/companyService';

const result = await getCompanyById('company-uuid');

if (result.success && result.data) {
  const company = result.data;
  console.log('Name:', company.company_name);
  console.log('Email:', company.email);
  console.log('Branch:', company.branch_master?.branch_name);
  console.log('City:', company.city_master?.city_name);
}
```

#### Get by Code
```typescript
import { getCompanyByCode } from './services/companyService';

const result = await getCompanyByCode('DLS001');

if (result.success && result.data) {
  console.log('Found:', result.data.company_name);
}
```

#### Get All Companies
```typescript
import { getAllCompanies } from './services/companyService';

// Simple - get all
const result = await getAllCompanies();

if (result.success && result.data) {
  console.log(`Total: ${result.count} companies`);
  result.data.forEach(company => {
    console.log(company.company_name);
  });
}
```

#### Get with Pagination and Search
```typescript
const page = 1;
const pageSize = 20;

const result = await getAllCompanies({
  limit: pageSize,
  offset: (page - 1) * pageSize,
  orderBy: 'company_name',
  ascending: true,
  searchTerm: 'logistics'
});

if (result.success) {
  console.log(`Page ${page}`);
  console.log(`Showing ${result.data?.length} of ${result.count}`);
}
```

#### Search Companies
```typescript
import { searchCompanies } from './services/companyService';

const result = await searchCompanies('logistics', 50);

if (result.success && result.data) {
  console.log(`Found ${result.data.length} matches`);
}
```

#### Get by Branch
```typescript
import { getCompaniesByBranch } from './services/companyService';

const result = await getCompaniesByBranch(branchId);

if (result.success && result.data) {
  console.log(`${result.count} companies in this branch`);
}
```

### UPDATE Operations

#### Update Single Field
```typescript
import { updateCompany } from './services/companyService';

const result = await updateCompany(
  companyId,
  { email: 'newemail@company.com' },
  user.id
);

if (result.success) {
  console.log('Updated:', result.data);
}
```

#### Update Multiple Fields
```typescript
const result = await updateCompany(
  companyId,
  {
    company_name: 'Updated Name',
    email: 'updated@email.com',
    contact_number: '9999999999',
    website: 'https://newsite.com'
  },
  user.id
);
```

#### Bulk Update
```typescript
import { bulkUpdateCompanies } from './services/companyService';

const updates = [
  {
    id: 'company-id-1',
    data: { email: 'new1@email.com' }
  },
  {
    id: 'company-id-2',
    data: { email: 'new2@email.com' }
  }
];

const result = await bulkUpdateCompanies(updates, user.id);
```

### DELETE Operations

#### Delete Single Company
```typescript
import { deleteCompany } from './services/companyService';

const result = await deleteCompany(companyId);

if (result.success) {
  console.log('Deleted successfully');
  alert(result.message);
} else {
  console.error('Delete failed:', result.error);
}
```

#### Bulk Delete
```typescript
import { bulkDeleteCompanies } from './services/companyService';

const ids = ['id1', 'id2', 'id3'];
const result = await bulkDeleteCompanies(ids);

if (result.success) {
  console.log(result.message); // "3 companies deleted successfully"
}
```

### UTILITY Functions

#### Check if Code Exists
```typescript
import { companyCodeExists } from './services/companyService';

// Check for new company
const exists = await companyCodeExists('DLS999');
if (exists) {
  alert('Code already in use!');
}

// Check for update (exclude current company)
const exists = await companyCodeExists('DLS999', currentCompanyId);
```

#### Get Total Count
```typescript
import { getCompanyCount } from './services/companyService';

const total = await getCompanyCount();
console.log(`Total companies: ${total}`);
```

## React Component Integration

### Complete Example
```typescript
import { useState, useEffect } from 'react';
import { getAllCompanies, createCompany, updateCompany, deleteCompany } from '../services/companyService';
import { useAuth } from '../contexts/AuthContext';

export function CompanyManagement() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  // Load companies on mount
  useEffect(() => {
    loadCompanies();
  }, []);

  // Fetch companies
  const loadCompanies = async () => {
    setLoading(true);
    const result = await getAllCompanies({
      orderBy: 'company_name',
      ascending: true,
      searchTerm
    });

    if (result.success && result.data) {
      setCompanies(result.data);
    } else {
      alert(result.error);
    }
    setLoading(false);
  };

  // Create handler
  const handleCreate = async (formData) => {
    const result = await createCompany(formData, user.id);

    if (result.success) {
      alert('Company created successfully!');
      loadCompanies();
      return true;
    } else {
      alert(`Error: ${result.error}`);
      return false;
    }
  };

  // Update handler
  const handleUpdate = async (id, formData) => {
    const result = await updateCompany(id, formData, user.id);

    if (result.success) {
      alert('Company updated successfully!');
      loadCompanies();
      return true;
    } else {
      alert(`Error: ${result.error}`);
      return false;
    }
  };

  // Delete handler
  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;

    const result = await deleteCompany(id);

    if (result.success) {
      alert('Company deleted successfully!');
      loadCompanies();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  return (
    <div>
      <h1>Company Management</h1>

      {/* Search */}
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search companies..."
      />
      <button onClick={loadCompanies}>Search</button>

      {/* Loading state */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          <p>Total: {companies.length}</p>

          {/* Company list */}
          {companies.map(company => (
            <div key={company.id}>
              <h3>{company.company_name}</h3>
              <p>Code: {company.company_code}</p>
              <p>Email: {company.email}</p>
              <button onClick={() => handleUpdate(company.id, {...})}>
                Edit
              </button>
              <button onClick={() => handleDelete(company.id, company.company_name)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Response Types

### CompanyResponse
```typescript
interface CompanyResponse<T = Company> {
  success: boolean;      // Operation success status
  data?: T;              // Company data (if successful)
  error?: string;        // Error message (if failed)
  message?: string;      // Success message
}
```

### CompanyListResponse
```typescript
interface CompanyListResponse {
  success: boolean;      // Operation success status
  data?: Company[];      // Array of companies
  error?: string;        // Error message (if failed)
  count?: number;        // Total count of records
}
```

## Validation Rules

### Required Fields
- `company_code`: Required, max 20 characters
- `company_name`: Required, max 200 characters

### Optional Field Validations
- `email`: Valid email format
- `gstin`: 15 characters, format: `22AAAAA0000A1Z5`
- `pan`: 10 characters, format: `ABCDE1234F`
- `cin`: Exactly 21 characters
- `pin_code`: 6 digits
- `contact_number`: 10-15 digits
- `ifsc_code`: 11 characters, format: `SBIN0001234`

## Error Handling Best Practices

```typescript
// Always check success before accessing data
const result = await getCompanyById(id);

if (result.success && result.data) {
  // Safe to use result.data
  console.log(result.data.company_name);
} else {
  // Handle error
  console.error(result.error);
  alert(result.error);
}

// Use try-catch for unexpected errors
try {
  const result = await createCompany(data, userId);

  if (result.success) {
    // Handle success
  } else {
    // Handle validation/business logic errors
  }
} catch (error) {
  // Handle unexpected errors
  console.error('Unexpected error:', error);
}
```

## Performance Considerations

### Pagination
Always use pagination for large datasets:
```typescript
const result = await getAllCompanies({
  limit: 50,
  offset: 0
});
```

### Search Optimization
Use the search parameter for efficient filtering:
```typescript
const result = await getAllCompanies({
  searchTerm: 'logistics',
  limit: 20
});
```

### Selective Field Loading
The service automatically includes related data (branch, city, state). If you need only basic fields, modify the select query.

## Security Notes

1. **Authentication**: All operations should verify user authentication
2. **Authorization**: Implement role-based access control at application level
3. **Input Validation**: Service validates all inputs before database operations
4. **SQL Injection**: Supabase client provides protection against SQL injection
5. **User Tracking**: Always pass user ID for audit trail

## Common Patterns

### Form Submission
```typescript
const handleSubmit = async (formData, isEdit) => {
  const userId = user.id;

  if (isEdit) {
    const result = await updateCompany(formData.id, formData, userId);
    return result;
  } else {
    const result = await createCompany(formData, userId);
    return result;
  }
};
```

### Confirmation Dialog
```typescript
const handleDelete = async (company) => {
  if (confirm(`Delete "${company.company_name}"?`)) {
    const result = await deleteCompany(company.id);
    if (result.success) {
      refreshList();
    }
  }
};
```

## Testing

### Unit Test Example
```typescript
import { validateCompanyData } from './companyService';

describe('Company Validation', () => {
  it('should validate required fields', () => {
    const result = validateCompanyData({
      company_code: '',
      company_name: ''
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Company code is required');
  });

  it('should validate email format', () => {
    const result = validateCompanyData({
      company_code: 'TEST',
      company_name: 'Test',
      email: 'invalid-email'
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Invalid email format');
  });
});
```

## Troubleshooting

### Common Issues

1. **"Company not found" error**
   - Verify the ID is correct
   - Check if record was deleted
   - Ensure user has access permissions

2. **"Company code already exists"**
   - Use unique company codes
   - Check existing codes before creating
   - Use `companyCodeExists()` function

3. **Validation errors**
   - Review validation rules above
   - Check field formats (GSTIN, PAN, etc.)
   - Ensure required fields are provided

4. **Network/Database errors**
   - Check Supabase connection
   - Verify environment variables
   - Check RLS policies on database

## Production Checklist

- ✅ All validation rules implemented
- ✅ Error handling in place
- ✅ User tracking configured
- ✅ Pagination implemented
- ✅ Search functionality working
- ✅ Build successful
- ✅ TypeScript types defined
- ✅ Related data loading configured
- ✅ Duplicate checking implemented
- ✅ Comprehensive documentation

## Support & Maintenance

For issues or enhancements:
1. Check this documentation
2. Review example files in `src/examples/`
3. Check console for detailed error messages
4. Verify database schema matches expectations

## License

This service is part of the DLS Logistics application.
