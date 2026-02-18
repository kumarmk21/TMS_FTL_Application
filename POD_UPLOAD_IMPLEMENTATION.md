# POD Upload Module - Implementation Summary

## Overview
Comprehensive POD (Proof of Delivery) Upload Module with integrated THC balance adjustments and automatic status updates.

## Database Changes

### 1. New Column Added
- **Table**: `thc_details`
- **Column**: `bth_due_date` (DATE)
- **Purpose**: Stores balance payment due date (POD received date + 45 days)

### 2. New Status Values Created
- **HARDCOPYPOD**: THC Financial status indicating hard copy POD received
- **ON TIME**: THC Operations status for on-time delivery
- **DELAY**: THC Operations status for delayed delivery

## Module Features

### Listing Page (`PODUpload.tsx`)
- **Data Source**: `booking_lr` table
- **Filter Criteria**: 
  - `manual_lr_no` IS NOT NULL
  - `pod_recd_date` IS NULL
- **Columns Displayed**:
  - LR Number
  - LR Date
  - Billing Party Name
  - From City
  - To City
  - Update Button
- **Additional Features**:
  - Real-time search across all displayed fields
  - Pagination (20 records per page)
  - Responsive design

### Update Modal (`UpdatePODModal.tsx`)

#### Read-only Fields (Auto-populated from booking_lr)
- manual_lr_no
- lr_date
- billing_party_name
- est_del_date
- act_del_date
- from_city
- to_city
- vehicle_type
- vehicle_number

#### Read-only Fields (Auto-populated from thc_details)
- thc_id
- thc_date
- thc_vendor
- thc_net_payable_amount
- thc_advance_amount
- thc_balance_amount (original)

#### User Input Fields
1. **POD Received Date** (mandatory, date picker)
2. **POD Received Type** (mandatory, dropdown)
   - Options: 'By Courier', 'Hand Delivery'

#### Conditional Fields (When "By Courier" selected)
3. **POD Courier Number** (mandatory, text)
4. **POD Upload** (mandatory, file upload)
   - Accepted formats: PDF, JPG, JPEG, PNG
   - Max size: 5MB
   - Storage: Supabase `pod-documents` bucket

#### THC Balance Adjustment Fields
5. **Unloading Charges** (addition +)
6. **Detention Charges** (addition +)
7. **Deduction - Delay** (subtraction -)
8. **Deduction - Damage** (subtraction -)
9. **New THC Balance Amount** (calculated, read-only)

## Business Logic

### Calculation Formula
```
New THC Balance Amount = Original Balance + Unloading + Detention - Delay Deduction - Damage Deduction
```

### Automatic Updates on Form Submission

#### Updates to `booking_lr` table:
- `pod_recd_date` = User input
- `pod_recd_type` = User input
- `pod_courier_number` = User input (if courier)
- `pod_upload` = File path (if courier)
- `lr_status` = "POD Recd"
- `lr_ops_status` = "PODHARDCOPY"
- `entry_date` = Current timestamp

#### Updates to `thc_details` table (if THC exists):
- `thc_status_fin` = UUID for "HARDCOPYPOD" status
- `thc_status_ops` = UUID for "ON TIME" or "DELAY" based on:
  - ON TIME: if act_del_date ≤ est_del_date
  - DELAY: if act_del_date > est_del_date
- `thc_unloading_charges` = User input
- `thc_detention_charges` = User input
- `thc_deduction_delay` = User input
- `thc_deduction_damage` = User input
- `thc_balance_amount` = Calculated new balance
- `unloading_date` = act_del_date from booking_lr
- `bth_due_date` = pod_recd_date + 45 days

## Validation Rules

### Form Validation
1. POD Received Date is required
2. POD Received Type is required
3. If "By Courier" selected:
   - POD Courier Number is required
   - POD Document upload is required
4. File validation:
   - Type: PDF, JPG, JPEG, PNG only
   - Size: Maximum 5MB

### Edge Cases Handled
- Null value handling for all numeric fields
- Date calculation edge cases
- Missing THC details scenario
- File upload failures
- Database transaction failures

## User Experience

### Success Flow
1. User selects LR from listing
2. Form opens with pre-populated data
3. User fills mandatory fields
4. User optionally adds THC adjustments
5. Real-time calculation shown
6. Submit updates both tables atomically
7. Success message displayed
8. Auto-redirect to listing (1.5s delay)
9. Record removed from listing

### Error Handling
- Clear validation messages
- File type/size errors
- Database error messages
- Network failure handling

## Security Features
- RLS policies on storage bucket
- Authenticated user access only
- File type validation
- Size limit enforcement
- SQL injection prevention (Supabase client)

## Navigation
**Operations → POD Upload**

## Technical Stack
- React 18 with TypeScript
- Supabase (Database + Storage)
- Tailwind CSS
- Lucide React Icons

## Migration Files Created
1. `add_bth_due_date_to_thc_details.sql`
2. `add_pod_thc_status_values_v2.sql`

## Files Modified/Created
- `/src/pages/PODUpload.tsx` (new)
- `/src/components/modals/UpdatePODModal.tsx` (new)
- `/src/components/Layout.tsx` (modified - added route)

## Production Ready
✅ All validations implemented
✅ Error handling complete
✅ Database migrations applied
✅ Build successful
✅ Security policies in place
✅ Responsive design
✅ User feedback implemented
