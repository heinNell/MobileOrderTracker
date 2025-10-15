-- Comprehensive fix for driver locations and order updates
-- This migration does 3 things:
-- 1. Removes the unique constraint to allow location history
-- 2. Creates optimized indexes
-- 3. Ensures orders table gets updated with latest driver location

-- ============================================================================
-- PART 1: Remove Unique Constraint and Create Better Indexes
-- ============================================================================

SELECT 'PART 1: Fixing driver_locations constraints and indexes' as step;

-- Remove the unique constraint that prevents location history
DROP INDEX IF EXISTS public.uq_driver_locations_driver_id;

-- Create optimized index for querying driver locations by time
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id_timestamp 
ON public.driver_locations(driver_id, timestamp DESC);

-- Create index for order-based location queries
CREATE INDEX IF NOT EXISTS idx_driver_locations_order_id_timestamp 
ON public.driver_locations(order_id, timestamp DESC) WHERE order_id IS NOT NULL;

-- Create composite index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_order_timestamp 
ON public.driver_locations(driver_id, order_id, timestamp DESC);

SELECT 'Indexes created successfully' as status;

-- ============================================================================
-- PART 2: Create/Update Trigger to Update Orders Table with Latest Location
-- ============================================================================

SELECT 'PART 2: Creating trigger to update orders table with driver location' as step;

-- Create or replace function to update order with driver's latest location
CREATE OR REPLACE FUNCTION public.update_order_with_driver_location()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if there's an order_id associated with this location
    IF NEW.order_id IS NOT NULL THEN
        -- Update the order's last_driver_location with the new location data
        UPDATE public.orders
        SET 
            last_driver_location = jsonb_build_object(
                'driver_id', NEW.driver_id,
                'latitude', NEW.latitude,
                'longitude', NEW.longitude,
                'location', NEW.location,
                'accuracy', NEW.accuracy,
                'accuracy_meters', NEW.accuracy_meters,
                'speed', NEW.speed,
                'speed_kmh', NEW.speed_kmh,
                'heading', NEW.heading,
                'timestamp', NEW.timestamp,
                'updated_at', NEW.created_at
            ),
            -- Also update the geometry_location if you have PostGIS
            geometry_location = CASE 
                WHEN NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL 
                THEN ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)
                ELSE geometry_location
            END,
            updated_at = NOW()
        WHERE id = NEW.order_id;
        
        RAISE NOTICE 'Updated order % with driver location', NEW.order_id;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the location insert
        RAISE WARNING 'Error updating order with driver location: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_order_with_driver_location ON public.driver_locations;

-- Create new trigger
CREATE TRIGGER trigger_update_order_with_driver_location
    AFTER INSERT OR UPDATE ON public.driver_locations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_order_with_driver_location();

SELECT 'Trigger created to update orders with driver location' as status;

-- ============================================================================
-- PART 3: Ensure Orders Table Has Required Columns
-- ============================================================================

SELECT 'PART 3: Ensuring orders table has required columns' as step;

-- Add last_driver_location column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'last_driver_location' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.orders 
        ADD COLUMN last_driver_location JSONB;
        
        RAISE NOTICE 'Added last_driver_location column to orders table';
    ELSE
        RAISE NOTICE 'last_driver_location column already exists';
    END IF;

    -- Add geometry_location column if it doesn't exist (for PostGIS)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'geometry_location' 
        AND table_schema = 'public'
    ) THEN
        -- Check if PostGIS is available
        IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
            ALTER TABLE public.orders 
            ADD COLUMN geometry_location GEOMETRY(POINT, 4326);
            
            -- Create spatial index
            CREATE INDEX IF NOT EXISTS idx_orders_geometry_location 
            ON public.orders USING GIST(geometry_location);
            
            RAISE NOTICE 'Added geometry_location column with spatial index';
        ELSE
            RAISE NOTICE 'PostGIS not available, skipping geometry_location column';
        END IF;
    ELSE
        RAISE NOTICE 'geometry_location column already exists';
    END IF;
END $$;

-- Create index on last_driver_location JSONB for better queries
CREATE INDEX IF NOT EXISTS idx_orders_last_driver_location 
ON public.orders USING GIN(last_driver_location);

-- Create index to find orders by driver's last location timestamp
CREATE INDEX IF NOT EXISTS idx_orders_last_location_timestamp 
ON public.orders(((last_driver_location->>'timestamp')::timestamptz)) 
WHERE last_driver_location IS NOT NULL;

SELECT 'Orders table columns ensured' as status;

-- ============================================================================
-- PART 4: Verification and Testing
-- ============================================================================

SELECT 'PART 4: Verification' as step;

-- Show all indexes on driver_locations
SELECT 
    'driver_locations indexes:' as info,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'driver_locations'
AND schemaname = 'public'
ORDER BY indexname;

-- Show all triggers on driver_locations
SELECT 
    'driver_locations triggers:' as info,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'driver_locations'
AND event_object_schema = 'public';

-- Show orders table structure
SELECT 
    'orders table location columns:' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('last_driver_location', 'geometry_location')
AND table_schema = 'public';

-- Sample query to verify functionality
SELECT 'Sample query - orders with driver locations:' as info;
SELECT 
    o.id,
    o.order_number,
    o.status,
    o.assigned_driver_id,
    o.last_driver_location->>'timestamp' as last_location_update,
    o.last_driver_location->>'latitude' as last_lat,
    o.last_driver_location->>'longitude' as last_lng
FROM orders o
WHERE o.last_driver_location IS NOT NULL
ORDER BY (o.last_driver_location->>'timestamp')::timestamptz DESC
LIMIT 5;

-- ============================================================================
-- PART 5: Optional - Create Helpful Views
-- ============================================================================

SELECT 'PART 5: Creating helpful views' as step;

-- View for latest driver locations
CREATE OR REPLACE VIEW v_driver_latest_locations AS
SELECT DISTINCT ON (driver_id)
    driver_id,
    order_id,
    latitude,
    longitude,
    location,
    accuracy_meters,
    speed_kmh,
    heading,
    timestamp,
    created_at,
    is_manual_update
FROM public.driver_locations
ORDER BY driver_id, timestamp DESC, created_at DESC;

-- View for orders with current driver location
CREATE OR REPLACE VIEW v_orders_with_driver_location AS
SELECT 
    o.*,
    dl.latitude as driver_latitude,
    dl.longitude as driver_longitude,
    dl.timestamp as driver_location_timestamp,
    dl.accuracy_meters as driver_location_accuracy,
    dl.speed_kmh as driver_speed
FROM orders o
LEFT JOIN LATERAL (
    SELECT * FROM driver_locations
    WHERE driver_locations.driver_id = o.assigned_driver_id
    AND driver_locations.order_id = o.id
    ORDER BY timestamp DESC
    LIMIT 1
) dl ON true
WHERE o.assigned_driver_id IS NOT NULL;

-- Grant access to views
GRANT SELECT ON v_driver_latest_locations TO authenticated;
GRANT SELECT ON v_orders_with_driver_location TO authenticated;

SELECT 'Views created successfully' as status;

-- ============================================================================
-- FINAL STATUS
-- ============================================================================

SELECT '✅ Migration completed successfully!' as result;
SELECT 'driver_locations table can now store location history' as note1;
SELECT 'orders table will be automatically updated with driver locations' as note2;
SELECT 'Use v_driver_latest_locations view for latest driver positions' as note3;
SELECT 'Use v_orders_with_driver_location view for orders with real-time driver data' as note4;
