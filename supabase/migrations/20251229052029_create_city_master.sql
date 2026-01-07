/*
  # Create City Master Table

  1. New Tables
    - `city_master`
      - `id` (uuid, primary key) - Unique identifier for each city
      - `city_name` (text, not null) - Name of the city
      - `state` (text, not null) - State where the city is located
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Security
    - Enable RLS on `city_master` table
    - Add policy for authenticated users to read city data
    - Add policy for admin users to insert city data
    - Add policy for admin users to update city data
    - Add policy for admin users to delete city data

  3. Indexes
    - Add index on city_name for faster lookups
    - Add index on state for filtering by state
*/

CREATE TABLE IF NOT EXISTS city_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name text NOT NULL,
  state text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_city_master_city_name ON city_master(city_name);
CREATE INDEX IF NOT EXISTS idx_city_master_state ON city_master(state);

-- Enable Row Level Security
ALTER TABLE city_master ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read city data
CREATE POLICY "Authenticated users can read city data"
  ON city_master
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Admin users can insert city data
CREATE POLICY "Admin users can insert city data"
  ON city_master
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admin users can update city data
CREATE POLICY "Admin users can update city data"
  ON city_master
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

-- Policy: Admin users can delete city data
CREATE POLICY "Admin users can delete city data"
  ON city_master
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );