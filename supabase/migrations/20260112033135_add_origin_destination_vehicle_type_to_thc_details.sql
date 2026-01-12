/*
  # Add Origin, Destination, and Vehicle Type to THC Details

  1. Changes
    - Add `origin` column to `thc_details` table
      - Text field to store origin city/location
    - Add `destination` column to `thc_details` table  
      - Text field to store destination city/location
    - Add `vehicle_type` column to `thc_details` table
      - Text field to store vehicle type (e.g., truck type/category)
    
  2. Purpose
    - These fields are populated during Operations -> Truck Dispatch
    - Provides complete trip information in THC records
    
  3. Notes
    - Fields are nullable for backward compatibility with existing records
    - New records created from Truck Dispatch will populate these fields
*/

-- Add origin, destination, and vehicle_type columns to thc_details
ALTER TABLE thc_details
ADD COLUMN IF NOT EXISTS origin text,
ADD COLUMN IF NOT EXISTS destination text,
ADD COLUMN IF NOT EXISTS vehicle_type text;

-- Add comments to document the fields
COMMENT ON COLUMN thc_details.origin IS 'Origin city/location for the trip. Populated during Operations -> Truck Dispatch.';
COMMENT ON COLUMN thc_details.destination IS 'Destination city/location for the trip. Populated during Operations -> Truck Dispatch.';
COMMENT ON COLUMN thc_details.vehicle_type IS 'Type/category of vehicle used for the trip. Populated during Operations -> Truck Dispatch.';