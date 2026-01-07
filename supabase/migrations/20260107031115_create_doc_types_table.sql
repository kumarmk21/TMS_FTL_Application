/*
  # Create Document Types Table

  ## New Tables
  
  ### `doc_types`
  Document types master table for categorizing documents in the system.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique identifier for each document type
  - `doc_type` (text, required) - Name/description of the document type
  - `created_at` (timestamptz) - Timestamp when the record was created
  - `created_by` (uuid, foreign key) - Reference to the user who created this record
  
  ## Security
  
  - Enable RLS on `doc_types` table
  - Authenticated users can view all document types
  - Only admin users can insert new document types
  - Only admin users can update document types
  - Only admin users can delete document types
  
  ## Indexes
  
  - Primary key index on `id` (automatic)
  - Foreign key index on `created_by` for performance
  
  ## Important Notes
  
  - All timestamps use `timestamptz` for timezone awareness
  - Created_by automatically references the logged-in user
  - RLS policies ensure proper access control
*/

-- Create the doc_types table
CREATE TABLE IF NOT EXISTS public.doc_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES public.profiles(id) NOT NULL
);

-- Add index on foreign key for performance
CREATE INDEX IF NOT EXISTS idx_doc_types_created_by ON public.doc_types(created_by);

-- Enable Row Level Security
ALTER TABLE public.doc_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Authenticated users can view all document types
CREATE POLICY "Authenticated users can view document types"
  ON public.doc_types FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert document types
CREATE POLICY "Admin users can insert document types"
  ON public.doc_types FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.jwt()->>'user_role') = 'admin');

-- Only admins can update document types
CREATE POLICY "Admin users can update document types"
  ON public.doc_types FOR UPDATE
  TO authenticated
  USING ((SELECT auth.jwt()->>'user_role') = 'admin')
  WITH CHECK ((SELECT auth.jwt()->>'user_role') = 'admin');

-- Only admins can delete document types
CREATE POLICY "Admin users can delete document types"
  ON public.doc_types FOR DELETE
  TO authenticated
  USING ((SELECT auth.jwt()->>'user_role') = 'admin');