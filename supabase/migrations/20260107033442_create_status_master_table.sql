/*
  # Create Status Master Table

  ## New Tables
  
  ### `status_master`
  Status master table for managing different statuses linked to document types.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique identifier for each status (Status_ID)
  - `status_type` (uuid, foreign key) - Reference to doc_types table
  - `status_name` (text, required) - Name/description of the status
  - `created_at` (timestamptz) - Timestamp when the record was created
  - `created_by` (uuid, foreign key) - Reference to the user who created this record
  
  ## Security
  
  - Enable RLS on `status_master` table
  - Authenticated users can view all statuses
  - Authenticated users can insert new statuses
  - Authenticated users can update statuses they created or admins can update any
  - Only admin users can delete statuses
  
  ## Indexes
  
  - Primary key index on `id` (automatic)
  - Foreign key index on `status_type` for performance
  - Foreign key index on `created_by` for performance
  
  ## Important Notes
  
  - All timestamps use `timestamptz` for timezone awareness
  - Created_by automatically references the logged-in user
  - RLS policies ensure proper access control
*/

-- Create the status_master table
CREATE TABLE IF NOT EXISTS public.status_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_type uuid REFERENCES public.doc_types(id) NOT NULL,
  status_name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES public.profiles(id) NOT NULL
);

-- Add indexes on foreign keys for performance
CREATE INDEX IF NOT EXISTS idx_status_master_status_type ON public.status_master(status_type);
CREATE INDEX IF NOT EXISTS idx_status_master_created_by ON public.status_master(created_by);

-- Enable Row Level Security
ALTER TABLE public.status_master ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Authenticated users can view all statuses
CREATE POLICY "Authenticated users can view statuses"
  ON public.status_master FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert statuses
CREATE POLICY "Authenticated users can insert statuses"
  ON public.status_master FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

-- Users can update their own statuses, admins can update any
CREATE POLICY "Users can update statuses"
  ON public.status_master FOR UPDATE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid()) OR 
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'admin'
  )
  WITH CHECK (
    created_by = (SELECT auth.uid()) OR 
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'admin'
  );

-- Only admins can delete statuses
CREATE POLICY "Admin users can delete statuses"
  ON public.status_master FOR DELETE
  TO authenticated
  USING ((SELECT auth.jwt()->'app_metadata'->>'user_role') = 'admin');
