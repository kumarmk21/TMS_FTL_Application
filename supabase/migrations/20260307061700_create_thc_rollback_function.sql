/*
  # Create THC Rollback Helper Function
  
  1. New Functions
    - `get_thc_upload_batches()` - Returns groups of THC records uploaded together
      - Groups by user and date
      - Shows records uploaded in the last 7 days
      - Includes record count and time range for each batch
  
  2. Purpose
    - Enable rollback of bulk uploaded THC records
    - Help identify recent upload batches for deletion
*/

CREATE OR REPLACE FUNCTION get_thc_upload_batches()
RETURNS TABLE (
  created_by uuid,
  upload_date date,
  record_count bigint,
  first_record timestamptz,
  last_record timestamptz
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    thc.created_by,
    DATE(thc.created_at) as upload_date,
    COUNT(*) as record_count,
    MIN(thc.created_at) as first_record,
    MAX(thc.created_at) as last_record
  FROM thc_details thc
  WHERE thc.created_at > NOW() - INTERVAL '7 days'
  GROUP BY thc.created_by, DATE(thc.created_at)
  HAVING COUNT(*) > 1
  ORDER BY MAX(thc.created_at) DESC;
$$;
