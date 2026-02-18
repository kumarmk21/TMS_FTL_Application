/*
  # Add POD-related THC Status Values
  
  1. New Status Records
    - Add 'HARDCOPYPOD' status for THC Financial status
    - Add 'ON TIME' status for THC Operations status
    - Add 'DELAY' status for THC Operations status
  
  2. Notes
    - These statuses are used when POD (Proof of Delivery) is received
    - HARDCOPYPOD indicates hard copy POD has been received (financial status)
    - ON TIME/DELAY indicates delivery timing (operations status)
    - status_type references the THC doc_type UUID
    - created_by uses system admin user
*/

DO $$
DECLARE
  thc_doc_type_id uuid;
  admin_user_id uuid;
BEGIN
  SELECT id INTO thc_doc_type_id FROM doc_types WHERE doc_type = 'THC';
  SELECT id INTO admin_user_id FROM profiles WHERE role = 'admin' LIMIT 1;
  
  IF thc_doc_type_id IS NOT NULL AND admin_user_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM status_master WHERE status_name = 'HARDCOPYPOD') THEN
      INSERT INTO status_master (id, status_type, status_name, created_at, created_by)
      VALUES (gen_random_uuid(), thc_doc_type_id, 'HARDCOPYPOD', now(), admin_user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM status_master WHERE status_name = 'ON TIME') THEN
      INSERT INTO status_master (id, status_type, status_name, created_at, created_by)
      VALUES (gen_random_uuid(), thc_doc_type_id, 'ON TIME', now(), admin_user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM status_master WHERE status_name = 'DELAY') THEN
      INSERT INTO status_master (id, status_type, status_name, created_at, created_by)
      VALUES (gen_random_uuid(), thc_doc_type_id, 'DELAY', now(), admin_user_id);
    END IF;
  END IF;
END $$;
