/*
  # Create Vehicle Tracking Tables for FreightTiger Integration

  1. New Tables
    - `freight_tiger_config`
      - `id` (uuid, primary key)
      - `config_name` (text) - Configuration name
      - `api_token` (text) - JWT token for API authentication
      - `integration_url` (text) - Integration URL endpoint
      - `prod_url` (text) - Production URL endpoint
      - `webhook_url` (text) - Webhook endpoint URL
      - `is_active` (boolean) - Whether config is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `freight_tiger_trips`
      - `id` (uuid, primary key)
      - `trip_id` (text, unique) - FreightTiger trip ID
      - `lr_id` (uuid, foreign key) - References booking_lr
      - `driver_number` (text) - Driver contact number
      - `vehicle_number` (text) - Vehicle registration number
      - `trip_data` (jsonb) - Complete trip data from FreightTiger
      - `status` (text) - Trip status
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `vehicle_locations`
      - `id` (uuid, primary key)
      - `trip_id` (text) - FreightTiger trip ID
      - `lr_id` (uuid, foreign key) - References booking_lr
      - `driver_number` (text) - Driver contact number
      - `vehicle_number` (text) - Vehicle registration number
      - `latitude` (numeric) - Current latitude
      - `longitude` (numeric) - Current longitude
      - `location_time` (timestamptz) - Time of location update
      - `speed` (numeric) - Speed in km/h
      - `location_data` (jsonb) - Complete location data
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Admin users can perform all operations
    - Branch users can view data from their branch

  3. Indexes
    - Index on driver_number for quick lookups
    - Index on vehicle_number for filtering
    - Index on trip_id for relationship queries
*/

-- Create freight_tiger_config table
CREATE TABLE IF NOT EXISTS freight_tiger_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name text NOT NULL DEFAULT 'Default Config',
  api_token text NOT NULL,
  integration_url text DEFAULT 'https://integration.freighttiger.com',
  prod_url text DEFAULT 'https://www.freighttiger.com',
  webhook_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create freight_tiger_trips table
CREATE TABLE IF NOT EXISTS freight_tiger_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id text UNIQUE,
  lr_id uuid REFERENCES booking_lr(tran_id) ON DELETE CASCADE,
  driver_number text NOT NULL,
  vehicle_number text NOT NULL,
  trip_data jsonb,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create vehicle_locations table
CREATE TABLE IF NOT EXISTS vehicle_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id text,
  lr_id uuid REFERENCES booking_lr(tran_id) ON DELETE CASCADE,
  driver_number text,
  vehicle_number text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  location_time timestamptz,
  speed numeric(10, 2),
  location_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE freight_tiger_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE freight_tiger_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_locations ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ft_trips_driver_number ON freight_tiger_trips(driver_number);
CREATE INDEX IF NOT EXISTS idx_ft_trips_vehicle_number ON freight_tiger_trips(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_ft_trips_lr_id ON freight_tiger_trips(lr_id);
CREATE INDEX IF NOT EXISTS idx_ft_trips_trip_id ON freight_tiger_trips(trip_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_loc_driver_number ON vehicle_locations(driver_number);
CREATE INDEX IF NOT EXISTS idx_vehicle_loc_vehicle_number ON vehicle_locations(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_vehicle_loc_lr_id ON vehicle_locations(lr_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_loc_trip_id ON vehicle_locations(trip_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_loc_time ON vehicle_locations(location_time DESC);

-- RLS Policies for freight_tiger_config

CREATE POLICY "Admin users can view FreightTiger config"
  ON freight_tiger_config
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can insert FreightTiger config"
  ON freight_tiger_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can update FreightTiger config"
  ON freight_tiger_config
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for freight_tiger_trips

CREATE POLICY "Admin users can view all trips"
  ON freight_tiger_trips
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Branch users can view own branch trips"
  ON freight_tiger_trips
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN booking_lr lr ON lr.tran_id = freight_tiger_trips.lr_id
      WHERE p.id = auth.uid()
      AND p.role = 'user'
      AND p.branch_code = lr.booking_branch
    )
  );

CREATE POLICY "Authenticated users can insert trips"
  ON freight_tiger_trips
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admin users can update trips"
  ON freight_tiger_trips
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for vehicle_locations

CREATE POLICY "Admin users can view all locations"
  ON vehicle_locations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Branch users can view own branch locations"
  ON vehicle_locations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN booking_lr lr ON lr.tran_id = vehicle_locations.lr_id
      WHERE p.id = auth.uid()
      AND p.role = 'user'
      AND p.branch_code = lr.booking_branch
    )
  );

CREATE POLICY "Authenticated users can insert locations"
  ON vehicle_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger to update updated_at for freight_tiger_config
CREATE OR REPLACE FUNCTION update_ft_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ft_config_updated_at
  BEFORE UPDATE ON freight_tiger_config
  FOR EACH ROW
  EXECUTE FUNCTION update_ft_config_updated_at();

-- Create trigger to update updated_at for freight_tiger_trips
CREATE OR REPLACE FUNCTION update_ft_trips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ft_trips_updated_at
  BEFORE UPDATE ON freight_tiger_trips
  FOR EACH ROW
  EXECUTE FUNCTION update_ft_trips_updated_at();
