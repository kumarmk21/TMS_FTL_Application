# FreightTiger Integration - Troubleshooting Guide

## Issues Fixed

### 1. Database Query Errors
**Problem**: Edge functions were failing with database query errors.

**Solution**: Updated both edge functions to use `maybeSingle()` instead of `single()` and added proper error handling.

### 2. API Payload Format
**Problem**: The payload sent to FreightTiger API didn't match their expected format.

**Solution**: Updated the trip payload to use FreightTiger's field names:
- `feed_unique_id` instead of `trip_id`
- `origin_city` instead of `origin`
- `destination_city` instead of `destination`
- `consignor_name` and `consignee_name` for proper naming
- `eway_bill_number` instead of `eway_bill`
- Added `lr_number` field

### 3. Better Error Messages
**Problem**: Generic error messages made debugging difficult.

**Solution**: Enhanced error handling to show:
- Specific error details from API
- LR number, driver number, and vehicle number in error messages
- More descriptive error states

## How to Test

### Testing "Add to FT" Function

1. Navigate to **Operations > Vehicle Tracking**
2. Find an LR with status "In Transit", "Dispatched", or "Out for Delivery"
3. Ensure the LR has:
   - Driver Number
   - Vehicle Number
   - Valid from/to cities
4. Click "Add to FT" button
5. Check for success message or detailed error

**Sample LRs Available for Testing**:
- LR2526-000022 (Driver: 9304566857, Vehicle: MH46CL1408)
- 507347 (Driver: 9972997364, Vehicle: KA56A0503)
- 507345 (Driver: 8015268288, Vehicle: TN37ED1144)

### Testing "Refresh" Location Function

1. First add a trip to FreightTiger (see above)
2. Wait a few minutes for GPS data to be available
3. Click "Refresh" button on the same LR
4. System will query FreightTiger API with driver number
5. If location data is available, it will be displayed

## Common Error Scenarios

### Error: "FreightTiger configuration not found"
**Cause**: The database doesn't have FreightTiger API configuration.

**Solution**: The configuration should already be in the database. Verify with:
```sql
SELECT * FROM freight_tiger_config WHERE is_active = true;
```

If missing, it was added during setup. Contact admin.

### Error: "Driver number and vehicle number are required"
**Cause**: The LR entry doesn't have driver or vehicle information.

**Solution**:
1. Edit the LR entry
2. Add driver number and vehicle number
3. Try adding to FreightTiger again

### Error: "Failed to fetch data from FreightTiger"
**Possible Causes**:
1. Invalid API token
2. Driver number not registered in FreightTiger system
3. Network connectivity issues
4. FreightTiger API is down

**Solution**:
1. Verify the API token is correct in `freight_tiger_config` table
2. Ensure the driver number exists in FreightTiger's system
3. Check FreightTiger API status
4. Review edge function logs in Supabase dashboard

### Error: "No location data available"
**Cause**: FreightTiger hasn't received GPS data from the device yet.

**Possible Reasons**:
1. Trip was just created (GPS data takes time)
2. Driver's mobile GPS is turned off
3. Driver hasn't installed/opened FreightTiger app
4. Device has no network connectivity

**Solution**:
1. Wait a few minutes after trip creation
2. Ensure driver has FreightTiger app installed
3. Ask driver to turn on GPS and mobile data
4. Try refreshing after some time

### Error: "No active session"
**Cause**: Your login session has expired.

**Solution**: Log out and log back in.

## Debugging Steps

### 1. Check Edge Function Logs

1. Go to Supabase Dashboard
2. Navigate to Edge Functions
3. Click on the function name (`add-freight-tiger-trip` or `get-vehicle-location`)
4. View logs for detailed error messages

### 2. Verify Database Configuration

```sql
-- Check FreightTiger config
SELECT id, config_name, is_active, prod_url, integration_url
FROM freight_tiger_config;

-- Check existing trips
SELECT trip_id, lr_id, driver_number, vehicle_number, status
FROM freight_tiger_trips;

-- Check location data
SELECT vehicle_number, latitude, longitude, location_time
FROM vehicle_locations
ORDER BY location_time DESC
LIMIT 10;
```

### 3. Test API Directly

You can test the FreightTiger API directly using curl:

```bash
# Get trip by driver number
curl -X GET \
  "https://www.freighttiger.com/saas/trip/driver/DRIVER_NUMBER" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Add a trip
curl -X POST \
  "https://www.freighttiger.com/saas/trip/add?token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "feed_unique_id": "LR2526-000001",
    "driver_number": "9876543210",
    "vehicle_number": "MH12AB1234",
    "origin_city": "Mumbai",
    "destination_city": "Delhi"
  }'
```

### 4. Frontend Console Logs

Open browser Developer Tools (F12) and check the Console tab for detailed error messages when clicking buttons.

## FreightTiger API Requirements

Based on the documentation, here's what FreightTiger expects:

### Add Trip API
**Endpoint**: `POST /saas/trip/add?token=YOUR_TOKEN`

**Required Fields**:
- `driver_number`: Driver's mobile number
- `vehicle_number`: Vehicle registration number
- `origin_city`: Starting city
- `destination_city`: Ending city

**Optional Fields**:
- `feed_unique_id`: Your internal trip/LR ID
- `start_date`: Trip start date
- `expected_delivery_date`: Expected delivery date
- `customer_name`: Customer name
- `consignor_name`: Consignor details
- `consignee_name`: Consignee details
- `package_count`: Number of packages
- `weight`: Total weight
- `invoice_number`: Invoice number
- `invoice_value`: Invoice value
- `eway_bill_number`: E-way bill number
- `lr_number`: LR number

### Get Trip by Driver API
**Endpoint**: `GET /saas/trip/driver/{driver_number}`

**Headers**:
- `Authorization: Bearer YOUR_TOKEN`

**Returns**: All active trips for the driver with location data

## Webhook Configuration

For automatic location updates, configure these webhooks with FreightTiger:

**Webhook URL**: `https://your-project.supabase.co/functions/v1/freight-tiger-webhook`

**Events to Subscribe**:
1. `tripevent.created` - Fires when a new trip is created
2. `trip.location_updated` - Fires when location is updated

**Benefits**:
- Real-time location updates without manual refresh
- Automatic data synchronization
- Better tracking accuracy

## Data Flow Diagram

```
┌─────────────┐
│   LR Entry  │
└──────┬──────┘
       │
       │ Click "Add to FT"
       ▼
┌──────────────────────┐
│  add-freight-tiger-  │
│     trip function    │
└──────┬───────────────┘
       │
       │ POST to FreightTiger API
       ▼
┌──────────────────────┐
│  FreightTiger System │
│  - Creates trip      │
│  - Sends to driver   │
└──────┬───────────────┘
       │
       │ Driver's GPS updates
       ▼
┌──────────────────────┐
│ Webhook/Manual Pull  │
│ - Location updates   │
│ - Speed, coords      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  vehicle_locations   │
│      table           │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Control Tower UI    │
│  - Display location  │
│  - Show on map       │
└──────────────────────┘
```

## Support & Contact

### For API Issues:
- Contact FreightTiger support
- Email: support@freighttiger.com
- Provide: Company ID, API token details, error messages

### For System Issues:
- Check Supabase edge function logs
- Review browser console for frontend errors
- Check database for configuration and data

### For Integration Help:
- Review API documentation PDF
- Check VEHICLE_TRACKING_GUIDE.md
- Test with sample LRs listed above

## Next Steps

1. Test "Add to FT" with existing LRs
2. Monitor edge function logs for any API errors
3. Configure webhook with FreightTiger for automatic updates
4. Train drivers to keep GPS enabled
5. Ensure FreightTiger app is installed on driver devices
