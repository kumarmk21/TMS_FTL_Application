# Vehicle Tracking System - Integration Guide

## Overview

A comprehensive Vehicle Tracking Control Tower has been integrated into your TMS application using FreightTiger GPS services. This system provides real-time vehicle location tracking for all in-transit shipments.

## Features Implemented

### 1. Database Schema
Three new tables have been created to manage GPS tracking data:

- **freight_tiger_config**: Stores FreightTiger API configuration
  - API token (pre-configured with your credentials)
  - Integration and production URLs
  - Webhook endpoints

- **freight_tiger_trips**: Stores trip information from FreightTiger
  - Links LR entries to FreightTiger trips
  - Maintains trip status and metadata

- **vehicle_locations**: Stores real-time location data
  - Latitude/longitude coordinates
  - Speed and timestamp information
  - Links to LR entries for tracking

### 2. Edge Functions (API Endpoints)

#### a) Webhook Receiver (`freight-tiger-webhook`)
- **URL**: `https://your-project.supabase.co/functions/v1/freight-tiger-webhook`
- **Purpose**: Receives real-time updates from FreightTiger
- **Events Handled**:
  - `tripevent.created`: New trip creation events
  - `trip.location_updated`: Vehicle location updates
- **Authentication**: Public (no JWT required for webhooks)

**Configuration Required**: Share this webhook URL with FreightTiger to receive automatic updates.

#### b) Get Vehicle Location (`get-vehicle-location`)
- **URL**: `https://your-project.supabase.co/functions/v1/get-vehicle-location`
- **Method**: GET
- **Parameters**: `driver_number` (required)
- **Purpose**: Fetches current location from FreightTiger API
- **Authentication**: Requires user JWT token

#### c) Add Trip to FreightTiger (`add-freight-tiger-trip`)
- **URL**: `https://your-project.supabase.co/functions/v1/add-freight-tiger-trip`
- **Method**: POST
- **Body**: `{ "lr_id": "uuid", "use_production": true }`
- **Purpose**: Registers a new trip with FreightTiger
- **Authentication**: Requires user JWT token

### 3. Vehicle Tracking Control Tower UI

Access via: **Operations > Vehicle Tracking**

#### Key Features:
- **Real-time Dashboard**: View all in-transit shipments with location data
- **Search & Filter**: Search by LR number, vehicle number, driver number, origin, or destination
- **Location Status Indicators**:
  - Green indicator: Location data available
  - Gray indicator: No location data
  - Blue badge: Active FreightTiger trip

- **Action Buttons**:
  - **View on Map**: Opens Google Maps with current coordinates
  - **Refresh**: Fetches latest location from FreightTiger
  - **Add to FT**: Registers the shipment with FreightTiger

- **Information Display**:
  - LR details and status
  - Vehicle and driver information
  - Origin and destination
  - Current location coordinates
  - Speed and last update time
  - Time since last location update

## How It Works

### Workflow

1. **LR Entry**: When creating an LR entry, driver and vehicle details are captured
2. **Trip Registration**: Click "Add to FT" to register the trip with FreightTiger
3. **Automatic Updates**: FreightTiger sends real-time location updates via webhook
4. **Manual Refresh**: Users can manually refresh location by clicking "Refresh"
5. **Location Tracking**: View latest coordinates, speed, and update time
6. **Map View**: Click "View on Map" to see exact location on Google Maps

### Data Flow

```
LR Entry → Add to FreightTiger → Trip Created
                                      ↓
                            Location Updates (Webhook)
                                      ↓
                              Database Storage
                                      ↓
                          Control Tower Display
```

## FreightTiger Configuration

Your FreightTiger credentials are pre-configured:
- **API Token**: Stored securely in database
- **Integration URL**: https://integration.freighttiger.com
- **Production URL**: https://www.freighttiger.com

## Webhook Setup

To receive automatic location updates, configure FreightTiger to send webhooks to:

**Webhook URL**: `https://your-supabase-project.supabase.co/functions/v1/freight-tiger-webhook`

Events to configure:
- `tripevent.created`
- `trip.location_updated`

## Security & Access Control

- **Admin Users**: Full access to all vehicle tracking data
- **Branch Users**: Can only view vehicles from their assigned branch
- **RLS Policies**: Enforce branch-level data isolation
- **Edge Functions**: Secured with JWT authentication (except webhook endpoint)

## Usage Instructions

### For Dispatchers/Operations Team:

1. Navigate to **Operations > Vehicle Tracking**
2. View all in-transit shipments
3. For new shipments without FreightTiger tracking:
   - Click "Add to FT" button
   - Wait for confirmation
4. To check latest location:
   - Click "Refresh" button
   - View updated coordinates and time
5. To see vehicle on map:
   - Click "View on Map"
   - Google Maps opens with exact location

### For Administrators:

1. Verify FreightTiger configuration:
   - Check `freight_tiger_config` table
   - Ensure API token is valid
2. Configure webhook endpoint with FreightTiger
3. Monitor `vehicle_locations` table for incoming updates
4. Review trip registration success rates

## Troubleshooting

### No Location Data Showing
- Ensure trip is registered with FreightTiger (click "Add to FT")
- Verify driver number matches FreightTiger records
- Check webhook is properly configured
- Try manual refresh

### Webhook Not Receiving Updates
- Verify webhook URL with FreightTiger support
- Check edge function logs in Supabase dashboard
- Ensure events are configured correctly

### Location Not Refreshing
- Verify FreightTiger API token is valid
- Check driver number is correct
- Review edge function logs for errors

## Technical Details

### Database Tables

```sql
-- View all FreightTiger trips
SELECT * FROM freight_tiger_trips;

-- View latest locations per vehicle
SELECT DISTINCT ON (vehicle_number) *
FROM vehicle_locations
ORDER BY vehicle_number, location_time DESC;

-- Join LR with location data
SELECT
  lr.manual_lr_no,
  lr.vehicle_number,
  vl.latitude,
  vl.longitude,
  vl.location_time
FROM booking_lr lr
LEFT JOIN vehicle_locations vl ON vl.lr_id = lr.tran_id
WHERE lr.lr_status = 'In Transit';
```

### API Testing

Test the edge functions using curl:

```bash
# Test webhook (public)
curl -X POST \
  https://your-project.supabase.co/functions/v1/freight-tiger-webhook \
  -H "Content-Type: application/json" \
  -d '{"event_type":"trip.location_updated","data":{"trip_id":"test123"}}'

# Test get location (requires auth)
curl -X GET \
  "https://your-project.supabase.co/functions/v1/get-vehicle-location?driver_number=1234567890" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test add trip (requires auth)
curl -X POST \
  https://your-project.supabase.co/functions/v1/add-freight-tiger-trip \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lr_id":"uuid-here","use_production":true}'
```

## Future Enhancements

Potential features for future development:
- Interactive map view with all vehicles displayed
- Route history and playback
- Geofencing and alerts
- Estimated time of arrival (ETA) calculations
- Driver behavior analytics
- Automatic status updates based on location
- Email/SMS notifications for delivery milestones

## Support

For issues or questions:
1. Check Supabase edge function logs
2. Review `vehicle_locations` table for incoming data
3. Verify FreightTiger API credentials
4. Contact FreightTiger support for API-related issues
