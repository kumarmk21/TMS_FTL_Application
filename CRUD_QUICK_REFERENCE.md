# Company CRUD Service - Quick Reference

## Import
```typescript
import { 
  createCompany, 
  getAllCompanies, 
  getCompanyById,
  updateCompany, 
  deleteCompany 
} from './services/companyService';
```

## CREATE
```typescript
// Basic
const result = await createCompany({
  company_code: 'DLS001',
  company_name: 'Company Name'
}, userId);

// Check result
if (result.success) {
  console.log('Created:', result.data);
}
```

## READ
```typescript
// By ID
const company = await getCompanyById('uuid');

// By Code
const company = await getCompanyByCode('DLS001');

// All companies
const companies = await getAllCompanies();

// With pagination
const companies = await getAllCompanies({
  limit: 20,
  offset: 0,
  orderBy: 'company_name',
  searchTerm: 'logistics'
});
```

## UPDATE
```typescript
const result = await updateCompany(
  companyId,
  { email: 'new@email.com' },
  userId
);
```

## DELETE
```typescript
const result = await deleteCompany(companyId);
```

## Response Format
```typescript
{
  success: boolean,
  data?: Company | Company[],
  error?: string,
  message?: string,
  count?: number
}
```

## Error Handling
```typescript
if (result.success) {
  // Use result.data
} else {
  // Handle result.error
}
```

## Validation Formats
- **GSTIN**: `27AAAAA0000A1Z5` (15 chars)
- **PAN**: `ABCDE1234F` (10 chars)
- **CIN**: 21 characters
- **PIN**: `400001` (6 digits)
- **IFSC**: `HDFC0001234` (11 chars)
- **Phone**: 10-15 digits
- **Email**: Valid email format

## Files
- **Service**: `/src/services/companyService.ts`
- **Examples**: `/src/examples/companyServiceExample.ts`
- **Docs**: `/COMPANY_CRUD_SERVICE_DOCUMENTATION.md`
