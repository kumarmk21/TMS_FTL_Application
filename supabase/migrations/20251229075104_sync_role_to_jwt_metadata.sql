/*
  # Sync Profile Role to JWT Metadata

  1. Purpose
    - Automatically sync profile role to auth.users app_metadata
    - Ensures JWT always contains current role information
    - Prevents RLS policy recursion issues

  2. Implementation
    - Creates trigger function to sync role on profile insert/update
    - Updates app_metadata in auth.users table
    - Runs automatically on every profile change

  3. Security
    - Maintains role consistency between profiles and JWT
    - Allows RLS policies to use JWT role without recursion
*/

-- Function to sync profile role to auth.users app_metadata
CREATE OR REPLACE FUNCTION sync_profile_role_to_jwt()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the user's app_metadata with the role from profiles
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(NEW.role)
  )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS sync_role_to_jwt_trigger ON profiles;

-- Create trigger to sync role on insert or update
CREATE TRIGGER sync_role_to_jwt_trigger
  AFTER INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_role_to_jwt();