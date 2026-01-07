/*
  # Create Vehicle Master Table

  1. New Tables
    - `vehicle_master`
      - `id` (uuid, primary key) - Unique identifier for each vehicle type
      - `vehicle_type` (text, not null) - Type/description of the vehicle (e.g., "17 FT OPEN", "32 FT MXL CBV 15 MT")
      - `vehicle_code` (text, unique, not null) - Unique code for the vehicle (e.g., "VEH001")
      - `is_active` (boolean) - Status flag to enable/disable vehicle types
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Security
    - Enable RLS on `vehicle_master` table
    - Add policy for authenticated users to read vehicle data
    - Add policy for admin users to insert vehicle data
    - Add policy for admin users to update vehicle data
    - Add policy for admin users to delete vehicle data

  3. Indexes
    - Add unique index on vehicle_code for fast lookups
    - Add index on is_active for filtering active vehicles
*/

CREATE TABLE IF NOT EXISTS vehicle_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type text NOT NULL,
  vehicle_code text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_master_code ON vehicle_master(vehicle_code);
CREATE INDEX IF NOT EXISTS idx_vehicle_master_active ON vehicle_master(is_active);

-- Enable Row Level Security
ALTER TABLE vehicle_master ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read vehicle data
CREATE POLICY "Authenticated users can read vehicle data"
  ON vehicle_master
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Admin users can insert vehicle data
CREATE POLICY "Admin users can insert vehicle data"
  ON vehicle_master
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admin users can update vehicle data
CREATE POLICY "Admin users can update vehicle data"
  ON vehicle_master
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

-- Policy: Admin users can delete vehicle data
CREATE POLICY "Admin users can delete vehicle data"
  ON vehicle_master
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );