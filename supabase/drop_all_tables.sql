-- DANGER: This will delete ALL existing tables and data
-- Only run this if you want to start completely fresh
-- Make sure you have backups if needed!

-- Drop existing tables in correct order (reverse of dependencies)
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS geofences CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS status_updates CASCADE;
DROP TABLE IF EXISTS location_updates CASCADE;
DROP TABLE IF EXISTS tracking CASCADE;
DROP TABLE IF EXISTS qr_scans CASCADE;
DROP TABLE IF EXISTS driver_comments CASCADE;
DROP TABLE IF EXISTS map_routes CASCADE;
DROP TABLE IF EXISTS map_locations CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS incident_type CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Verify everything is dropped
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
