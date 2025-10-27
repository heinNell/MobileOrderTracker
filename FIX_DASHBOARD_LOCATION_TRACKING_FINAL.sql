-- FINAL CORRECTED: Fix dashboard location tracking 
-- This fixes all PostgreSQL errors including index predicate issues

-- First, create the working function
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
    location_timestamp timestamptz,
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
        COALESCE(dl."timestamp", dl.created_at) as location_timestamp,
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

-- Create a simple view as alternative
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
    COALESCE("timestamp", created_at) as location_timestamp,
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

-- Create index for better performance (without immutable function in WHERE clause)
CREATE INDEX IF NOT EXISTS idx_driver_locations_tracking 
ON driver_locations (driver_id, order_id, created_at DESC);

-- Create simple index on timestamp column if it exists (with quotes, no WHERE clause)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_locations' AND column_name = 'timestamp') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_driver_locations_timestamp ON driver_locations ("timestamp" DESC)';
    END IF;
END $$;

-- Create basic index on latitude/longitude for location queries
CREATE INDEX IF NOT EXISTS idx_driver_locations_coords 
ON driver_locations (latitude, longitude);

SELECT 'Dashboard location tracking schema updated successfully - all errors fixed' AS status;
