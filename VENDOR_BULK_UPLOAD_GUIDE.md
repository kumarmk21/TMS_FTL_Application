# Vendor Master Bulk Upload Guide

## Overview

The Vendor Master page now supports bulk upload functionality, allowing users to import multiple vendors at once using a CSV file template.

---

## Features

### 1. Download Template
- Downloads a pre-formatted CSV template file
- Contains sample data showing the correct format
- Includes all required and optional fields with examples

### 2. Upload File
- Upload filled CSV template to create multiple vendors
- Validates data before inserting into database
- Shows detailed error messages for any issues
- Supports partial uploads (valid records are inserted even if some have errors)

---

## How to Use

### Step 1: Download Template

1. Navigate to **Master → Vendor Master**
2. Click the **"Download Template"** button (green)
3. A file named `vendor_master_template.csv` will be downloaded

### Step 2: Fill the Template

Open the downloaded CSV file in Excel, Google Sheets, or any spreadsheet application.

**Required Fields:**
- Vendor Code
- Vendor Name
- Vendor Type
- Vendor Address
- Vendor Phone

**Optional Fields:**
- PAN
- Email ID
- Account No
- Bank Name
- IFSC Code
- TDS Applicable (Y/N)
- TDS Category
- TDS Rate (%)
- Status (Active/Inactive)

**Example:**
```csv
Vendor Code,Vendor Name,Vendor Type,Vendor Address,Vendor Phone,PAN,Email ID,Account No,Bank Name,IFSC Code,TDS Applicable (Y/N),TDS Category,TDS Rate (%),Status (Active/Inactive)
VEND001,Sample Vendor Ltd,Transporter,123 Main Street Mumbai 400001,9876543210,ABCDE1234F,vendor@example.com,1234567890,HDFC Bank,HDFC0001234,Y,194C,2,Active
VEND002,Another Vendor Pvt Ltd,Admin,456 Park Road Delhi 110001,9876543211,FGHIJ5678K,another@example.com,9876543210,ICICI Bank,ICIC0005678,N,,,Active
```

### Step 3: Upload Filled Template

1. Save your filled CSV file
2. Click the **"Upload File"** button (blue) on the Vendor Master page
3. Select your CSV file
4. Wait for the upload to complete
5. A success message will show how many vendors were uploaded
6. If any errors occurred, they will be listed in the alert message

---

## CSV Format Rules

### General Rules
- First row must be the header row (column names)
- Each subsequent row represents one vendor
- Fields must be comma-separated
- Empty optional fields can be left blank

### Field Specifications

| Column | Type | Required | Format | Example |
|--------|------|----------|--------|---------|
| Vendor Code | Text | Yes | Any alphanumeric | VEND001 |
| Vendor Name | Text | Yes | Any text | ABC Transport Ltd |
| Vendor Type | Text | Yes | Transporter or Admin | Transporter |
| Vendor Address | Text | Yes | Full address | 123 Main St Mumbai 400001 |
| Vendor Phone | Text | Yes | 10 digits | 9876543210 |
| PAN | Text | No | 10 characters | ABCDE1234F |
| Email ID | Text | No | Valid email | vendor@example.com |
| Account No | Text | No | Bank account | 1234567890 |
| Bank Name | Text | No | Bank name | HDFC Bank |
| IFSC Code | Text | No | 11 characters | HDFC0001234 |
| TDS Applicable | Text | No | Y or N | Y |
| TDS Category | Text | No | Category code | 194C |
| TDS Rate | Number | No | Percentage | 2 |
| Status | Text | No | Active or Inactive | Active |

### Validation Rules

1. **Vendor Code must be unique** - Cannot upload duplicate vendor codes
2. **Vendor Type must be 'Transporter' or 'Admin'** - Exact match required, case sensitive
3. **Phone numbers should be 10 digits** - No special characters or spaces
4. **PAN should be 10 characters** - Format: ABCDE1234F
5. **IFSC should be 11 characters** - Format: HDFC0001234
6. **TDS Applicable must be Y or N** - Case insensitive
7. **TDS Rate must be a number** - Between 0 and 100
8. **Status must be Active or Inactive** - Case insensitive

---

## Error Handling

### Common Errors and Solutions

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "CSV file is empty or invalid" | File has no data rows | Add at least one vendor record |
| "Line X: Insufficient columns" | Row has missing columns | Ensure all 14 columns are present |
| "Line X: Missing required fields" | Required field is empty | Fill in Code, Name, Type, Address, and Phone |
| "Line X: Invalid Vendor Type" | Vendor Type is not valid | Use only 'Transporter' or 'Admin' |
| "Duplicate key value violates unique constraint" | Vendor code already exists | Use unique vendor codes |
| "Please upload a CSV file" | Wrong file type | Save as CSV format (.csv) |

### Partial Upload Success

If some rows have errors but others are valid:
- ✅ Valid vendors will be uploaded successfully
- ❌ Invalid rows will be skipped
- 📊 Alert message shows both success count and errors

**Example Alert:**
```
Successfully uploaded 5 vendor(s)!

Errors encountered:
Line 3: Missing required fields (Code, Name, Address, or Phone)
Line 7: Insufficient columns
```

---

## Best Practices

### 1. Data Preparation
- ✅ Clean your data before upload (remove extra spaces, special characters)
- ✅ Use consistent formatting for phone numbers (10 digits only)
- ✅ Verify PAN and IFSC codes are correct
- ✅ Use unique vendor codes for each vendor

### 2. Testing
- ✅ Test with 2-3 sample vendors first
- ✅ Verify data appears correctly after upload
- ✅ Check if TDS and bank details are imported correctly

### 3. Large Uploads
- ✅ For 100+ vendors, split into batches of 50
- ✅ Upload one batch at a time
- ✅ Verify each batch before proceeding

### 4. Data Backup
- ⚠️ Export existing vendors before bulk upload (future feature)
- ⚠️ Keep a backup copy of your CSV file

---

## Troubleshooting

### Problem: Upload button does nothing
**Solution:** Check if the file extension is .csv (not .xlsx or .txt)

### Problem: All records show as errors
**Solution:**
1. Verify the header row matches exactly
2. Check for missing commas between fields
3. Ensure no extra columns or rows

### Problem: Numbers stored incorrectly
**Solution:**
- Phone numbers: Remove any +91 or special characters
- TDS Rate: Use numbers only (e.g., 2 not 2%)
- Account numbers: Remove spaces or dashes

### Problem: Special characters causing issues
**Solution:**
- Avoid commas in address fields (use semicolon instead)
- Remove line breaks within fields
- Use plain text, not formatted text

---

## Template Fields Explained

### Vendor Type
- **Transporter** = Vendor who provides transportation services
- **Admin** = Vendor who provides administrative services
- This field is mandatory and must be exactly 'Transporter' or 'Admin' (case sensitive)

### TDS Applicable (Y/N)
- **Y** = TDS is applicable for this vendor
- **N** = TDS is not applicable
- If Y, then TDS Category and TDS Rate should be provided

### TDS Category
Common categories:
- **194C** = Payment to contractors/sub-contractors
- **194H** = Commission or brokerage
- **194J** = Professional or technical services
- **194I** = Rent

### TDS Rate (%)
- Enter as number without % symbol
- Example: For 2%, enter **2**
- For 10%, enter **10**

### Status
- **Active** = Vendor is currently active and can be used
- **Inactive** = Vendor is disabled and won't appear in active lists

---

## Sample Data

Here's a complete example with 3 vendors:

```csv
Vendor Code,Vendor Name,Vendor Type,Vendor Address,Vendor Phone,PAN,Email ID,Account No,Bank Name,IFSC Code,TDS Applicable (Y/N),TDS Category,TDS Rate (%),Status (Active/Inactive)
TRANS001,Swift Transport Services,Transporter,Plot 45 Sector 18 Gurgaon 122001,9876543210,AABCT1234E,swift@transport.com,50100123456789,HDFC Bank,HDFC0001234,Y,194C,2,Active
LOG002,Express Logistics Pvt Ltd,Transporter,15 Industrial Area Phase-1 Pune 411001,9876543211,AACCE5678F,info@expresslog.com,987654321012,ICICI Bank,ICIC0005678,Y,194C,2,Active
PACK003,Premium Packaging Co,Admin,789 Ring Road Bangalore 560001,9876543212,AADCP9012G,contact@packaging.com,123456789098,Axis Bank,UTIB0001234,N,,,Active
```

---

## Technical Details

### File Processing
- **Max file size:** No hard limit (reasonable sizes recommended)
- **Encoding:** UTF-8
- **Line endings:** Both Windows (CRLF) and Unix (LF) supported
- **Processing:** Client-side parsing, then batch insert to database

### Performance
- **Small uploads (1-50 vendors):** ~2-5 seconds
- **Medium uploads (51-200 vendors):** ~5-15 seconds
- **Large uploads (200+ vendors):** Consider splitting into batches

### Security
- ✅ User authentication required
- ✅ Role-based access control (Admin/User)
- ✅ Database validation and constraints
- ✅ SQL injection protection (parameterized queries)

---

## Future Enhancements

Planned features for future releases:

1. **Export Existing Vendors** - Download current vendor list as CSV
2. **Excel Support** - Upload .xlsx files directly
3. **Update via Upload** - Update existing vendors using CSV
4. **Validation Preview** - See preview before actual upload
5. **Progress Bar** - Visual progress for large uploads
6. **Download Error Report** - Export failed rows as CSV for correction

---

## Support

If you encounter issues with bulk upload:

1. **Check the error message** - It usually tells you exactly what's wrong
2. **Verify your CSV format** - Compare with the downloaded template
3. **Try uploading one record** - Test if the issue is with a specific vendor
4. **Contact support** - Provide the error message and sample data (without sensitive info)

---

**Last Updated:** January 6, 2026
**Version:** 1.0
