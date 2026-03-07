# THC Bulk Upload Guide

## Overview
The THC Bulk Upload feature allows you to import old THC (Truck Hire Challan) records with different nomenclatures into the system. This is particularly useful for migrating historical data or importing unpaid THC records.

## Location
**Operations → THC Bulk Upload**

## Features

### 1. Download Template
- Click the "Download Template" button to get an Excel file with the correct format
- The template includes sample data showing the expected format for each field
- Column widths are pre-configured for easy data entry

### 2. Upload THC Records
- Fill in the template with your old THC records
- Upload the completed Excel file
- System will validate and import the records
- Detailed success/failure report is displayed after upload

## Template Fields

### Required Fields
| Field | Description | Format/Notes |
|-------|-------------|--------------|
| **THC ID Number** | Old THC identifier | Any format (e.g., OLD-THC-001, THC/2024/001) |
| **Vendor Name** | Vendor name | Must match existing vendor in system (case-insensitive) |
| **Vehicle Number** | Vehicle registration | Standard format (e.g., MH01AB1234) |

### Date Fields
| Field | Description | Required |
|-------|-------------|----------|
| THC Date | Date of THC creation | Optional |
| THC Entry Date | Date entered in system | Optional |
| Advance Date | Advance payment date | Optional |
| Balance Payment Date | Balance payment date | Optional |
| ATH Date | Advance payment due date | Optional |
| BTH Due Date | Balance payment due date | Optional |
| Unloading Date | Date of unloading | Optional |

**Date Format:** YYYY-MM-DD or Excel date format

### Financial Fields (All Optional - Default to 0)
| Field | Description |
|-------|-------------|
| THC Gross Amount | Gross THC amount before calculations |
| THC Amount | Base THC amount |
| Loading Charges | Additional loading charges |
| Unloading Charges | Additional unloading charges |
| Detention Charges | Additional detention charges |
| Other Charges | Other additional charges |
| Deduction Delay | Deduction for delays |
| Deduction Damage | Deduction for damages |
| Munshiyana Amount | Munshiyana deduction |
| POD Delay Deduction | POD delay deduction |
| TDS Amount | TDS deduction |
| Net Payable Amount | Final payable amount |
| Advance Amount | Advance payment amount |
| Balance Amount | Balance payment amount |

### Reference Fields (Optional)
| Field | Description | Notes |
|-------|-------------|-------|
| LR Number | Link to existing LR | Must match existing LR in system |
| Origin | Origin city/location | Text field |
| Destination | Destination city/location | Text field |
| Vehicle Type | Type of vehicle | Text field |
| Driver Mobile | Driver contact number | 10-digit number |
| Current Location | Current location status | Text field |
| FT Trip ID | FreightTiger Trip ID | Text field |

### Status Fields (Optional)
| Field | Description | Notes |
|-------|-------------|-------|
| THC Status Operations | Operations status | Must match existing status in system |
| THC Status Finance | Finance status | Must match existing status in system |

**Common Status Values:**
- Operations: Dispatched, In Transit, Delivered, POD Uploaded
- Finance: ATH Prepared, ATH Uploaded, BTH Prepared, BTH Uploaded

### Bank Account Fields (Optional)
| Field | Description |
|-------|-------------|
| Account Name | Vendor account name |
| Account Number | Bank account number |
| Account IFSC | IFSC code |
| Account Bank | Bank name |
| Account Branch | Branch name |

### UTR Reference Fields (Optional)
| Field | Description |
|-------|-------------|
| Advance UTR Number | UTR for advance payment |
| Balance UTR Details | UTR for balance payment |

## Import Process

1. **Download Template**
   - Click "Download Template" button
   - Template is saved as `THC_Bulk_Upload_Template.xlsx`

2. **Fill Template**
   - Open the template in Excel
   - Fill in your THC records row by row
   - Ensure vendor names match existing vendors
   - Use consistent date formats
   - All financial fields should be numeric

3. **Upload File**
   - Click "Choose Excel file to upload"
   - Select your completed file
   - Click "Upload THC Records"
   - Wait for processing to complete

4. **Review Results**
   - Success count shows successful imports
   - Failed count shows failed imports
   - Detailed error messages are displayed for failed records
   - Each error shows the row number and reason for failure

## Validation Rules

### Vendor Validation
- Vendor name must match an existing vendor (case-insensitive match)
- If vendor not found, record will fail with error

### LR Number Validation
- If LR Number is provided, it must exist in the system
- If LR not found, the THC will still be created but without LR link
- Leave blank if THC is not linked to any LR

### Status Validation
- Status names must match existing statuses (case-insensitive match)
- If status not found, field will be left null
- THC can be created without status values

### Date Validation
- Dates should be in YYYY-MM-DD format or Excel date format
- Invalid dates will cause import failure

### Numeric Validation
- All amount fields must be numeric values
- Empty fields default to 0
- Non-numeric values will cause import failure

## Common Scenarios

### Importing Unpaid Old THCs
```excel
THC ID Number: OLD-THC-001
THC Date: 2024-01-15
Vendor Name: ABC Transport
Vehicle Number: MH01AB1234
THC Amount: 50000
Net Payable Amount: 50000
Advance Amount: 0
Balance Amount: 50000
```

### Importing Partially Paid THCs
```excel
THC ID Number: OLD-THC-002
THC Date: 2024-01-15
Vendor Name: XYZ Logistics
Vehicle Number: GJ01CD5678
THC Amount: 50000
Net Payable Amount: 48000
Advance Amount: 25000
Advance Date: 2024-01-16
Balance Amount: 23000
```

### Importing Fully Paid THCs
```excel
THC ID Number: OLD-THC-003
THC Date: 2024-01-15
Vendor Name: PQR Transport
Vehicle Number: DL01EF9012
THC Amount: 50000
Net Payable Amount: 47000
Advance Amount: 25000
Advance Date: 2024-01-16
Balance Amount: 22000
Balance Payment Date: 2024-01-25
```

## Tips for Successful Import

1. **Prepare Vendor Master First**
   - Ensure all vendors are created in Vendor Master before import
   - Check vendor names for exact spelling

2. **Use Template as Reference**
   - Don't modify column headers
   - Keep the same column order
   - Add your data starting from row 2

3. **Handle Dates Carefully**
   - Use YYYY-MM-DD format for consistency
   - Excel date format also works
   - Empty date fields are acceptable

4. **Financial Calculations**
   - System does not auto-calculate net payable
   - Provide the final calculated amounts
   - Ensure advance + balance = net payable

5. **Status Mapping**
   - Check Status Master for exact status names
   - Match the spelling and case
   - Leave blank if unsure

6. **Batch Processing**
   - Import in batches of 50-100 records for better error tracking
   - Review errors after each batch
   - Fix errors and re-upload failed records

## Error Handling

### Common Errors

**"Vendor not found"**
- Solution: Check vendor name spelling in Vendor Master
- Ensure exact name match (case-insensitive)

**"LR lookup failed"**
- Solution: Verify LR Number exists in system
- Or leave LR Number field blank

**"Invalid date format"**
- Solution: Use YYYY-MM-DD format
- Or use Excel date format (right-click → Format Cells → Date)

**"Invalid numeric value"**
- Solution: Ensure all amount fields contain only numbers
- Remove any currency symbols or text

**"Status lookup failed"**
- Solution: Check Status Master for exact status names
- Or leave status fields blank

### Reviewing Errors
- After upload, failed records are displayed with error details
- Each error shows:
  - Row number in the Excel file
  - Specific error message
  - THC ID Number for reference
- Fix errors in the Excel file and re-upload

## Best Practices

1. **Data Validation Before Upload**
   - Validate vendor names against Vendor Master
   - Check date formats
   - Verify all amounts are numeric

2. **Incremental Import**
   - Start with a small batch (10-20 records)
   - Verify successful import
   - Proceed with larger batches

3. **Record Keeping**
   - Keep original Excel files as backup
   - Document any data transformations
   - Note any special cases or exceptions

4. **Post-Import Verification**
   - Check imported records in THC Print
   - Verify financial amounts
   - Confirm status values

## Support

For issues or questions about THC Bulk Upload:
1. Review error messages carefully
2. Check field formats match template
3. Verify master data (vendors, statuses) exists
4. Contact system administrator if problems persist
