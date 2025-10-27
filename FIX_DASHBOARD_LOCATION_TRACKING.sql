-- Fix dashboard location tracking after mobile app schema changes
-- This ensures the dashboard can properly display driver locations

-- First, let's check what tables and data we have
-- Run this to diagnose current state:

-- Check if driver_locations table exists and what columns it has
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'driver_locations' 
ORDER BY ordinal_position;

-- Check recent location data
SELECT COUNT(*) as total_locations, 
       MAX(created_at) as latest_location,
       MIN(created_at) as earliest_location
FROM driver_locations;

-- Check if there are any driver locations with order associations
SELECT order_id, driver_id, 
       latitude, longitude, 
       created_at, timestamp
FROM driver_locations 
ORDER BY created_at DESC 
LIMIT 10;

-- Check location_updates table if it exists (legacy)
SELECT COUNT(*) as total_location_updates
FROM information_schema.tables 
WHERE table_name = 'location_updates';

-- If location_updates table exists, check its data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'location_updates') THEN
        -- Create a temporary view to show location_updates data
        EXECUTE 'CREATE OR REPLACE VIEW recent_location_updates AS 
                 SELECT * FROM location_updates 
                 ORDER BY timestamp DESC 
                 LIMIT 10';
        RAISE NOTICE 'location_updates table exists - check recent_location_updates view';
    ELSE
        RAISE NOTICE 'location_updates table does not exist';
    END IF;
END $$;

-- Create a unified view for dashboard location tracking
CREATE OR REPLACE VIEW dashboard_driver_locations AS
SELECT DISTINCT ON (driver_id, order_id)
    id,
    driver_id,
    order_id,
    latitude::numeric as latitude,
    longitude::numeric as longitude,
    accuracy,
    speed,
    heading,
    COALESCE(timestamp, created_at) as timestamp,
    created_at,
    location_source
FROM driver_locations
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY driver_id, order_id, created_at DESC;

-- Grant permissions for the view
GRANT SELECT ON dashboard_driver_locations TO authenticated;
GRANT SELECT ON dashboard_driver_locations TO service_role;

-- Create an optimized function for the dashboard to get latest locations
CREATE OR REPLACE FUNCTION get_latest_driver_locations()
RETURNS TABLE (
    id uuid,
    driver_id uuid,
    order_id uuid,
    latitude numeric,
    longitude numeric,
    accuracy numeric,
    speed numeric,
    heading numeric,
    timestamp timestamptz,
    created_at timestamptz,
    location_source text,
    driver_name text,
    order_number text,
    order_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (dl.driver_id, dl.order_id)
        dl.id,
        dl.driver_id,
        dl.order_id,
        dl.latitude::numeric,
        dl.longitude::numeric,
        dl.accuracy,
        dl.speed,
        dl.heading,
        COALESCE(dl.timestamp, dl.created_at) as timestamp,
        dl.created_at,
        dl.location_source,
        COALESCE(u.full_name, u.email) as driver_name,
        o.order_number,
        o.status as order_status
    FROM driver_locations dl
    LEFT JOIN users u ON u.id = dl.driver_id
    LEFT JOIN orders o ON o.id = dl.order_id
    WHERE dl.latitude IS NOT NULL 
      AND dl.longitude IS NOT NULL
      AND dl.created_at >= NOW() - INTERVAL '24 hours'
    ORDER BY dl.driver_id, dl.order_id, dl.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_latest_driver_locations() TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_driver_locations() TO service_role;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_driver_locations_recent 
ON driver_locations (driver_id, order_id, created_at DESC) 
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- Also create index on timestamp if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_locations' AND column_name = 'timestamp') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_driver_locations_timestamp ON driver_locations (timestamp DESC) WHERE timestamp >= NOW() - INTERVAL ''24 hours''';
    END IF;
END $$;

SELECT 'Dashboard location tracking schema updated successfully' AS status;
