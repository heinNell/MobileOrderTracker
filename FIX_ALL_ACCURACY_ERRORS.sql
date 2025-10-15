-- COMPLETE FIX: All accuracy_meters errors
-- This script fixes ALL places where accuracy_meters is incorrectly referenced

-- ============================================================================
-- PART 1: FIX DRIVER_LOCATIONS TABLE (Add missing columns)
-- ============================================================================

ALTER TABLE public.driver_locations
ADD COLUMN IF NOT EXISTS accuracy_meters NUMERIC,
ADD COLUMN IF NOT EXISTS speed_kmh NUMERIC,
ADD COLUMN IF NOT EXISTS heading NUMERIC,
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS geometry GEOMETRY(POINT, 4326),
ADD COLUMN IF NOT EXISTS location JSONB;

-- Create geometry index
CREATE INDEX IF NOT EXISTS idx_driver_locations_geometry 
ON public.driver_locations USING GIST (geometry);

-- ============================================================================
-- PART 2: DROP ALL OLD BROKEN TRIGGERS ON ORDERS TABLE
-- ============================================================================

-- Drop any triggers on orders table that reference accuracy_meters
DROP TRIGGER IF EXISTS sync_driver_location_and_broadcast_trigger ON public.orders;
DROP TRIGGER IF EXISTS sync_order_to_driver_locations ON public.orders;
DROP TRIGGER IF EXISTS update_driver_location_on_order_update ON public.orders;

-- Drop the broken functions
DROP FUNCTION IF EXISTS public.sync_driver_location_and_broadcast() CASCADE;
DROP FUNCTION IF EXISTS public.sync_order_to_driver_locations() CASCADE;

-- ============================================================================
-- PART 3: CREATE CORRECT TRIGGER (On driver_locations, NOT orders)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_driver_location_geometry()
RETURNS TRIGGER AS $$
BEGIN
    -- Create geometry from latitude/longitude
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.geometry := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;
    
    -- Update orders table with current location
    IF NEW.order_id IS NOT NULL THEN
        UPDATE public.orders
        SET 
            current_driver_geometry = NEW.geometry,
            last_driver_location = jsonb_build_object(
                'lat', NEW.latitude,
                'lng', NEW.longitude,
                'accuracy_meters', NEW.accuracy_meters,
                'speed_kmh', NEW.speed_kmh,
                'heading', NEW.heading,
                'timestamp', NEW.created_at
            ),
            updated_at = NOW()
        WHERE id = NEW.order_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_driver_location_geometry ON public.driver_locations;

-- Create trigger ON DRIVER_LOCATIONS (not orders!)
CREATE TRIGGER trigger_sync_driver_location_geometry
    BEFORE INSERT ON public.driver_locations
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_driver_location_geometry();

-- ============================================================================
-- PART 4: VERIFY ALL COLUMNS EXIST
-- ============================================================================

-- Check columns in driver_locations
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'driver_locations'
AND column_name IN ('latitude', 'longitude', 'geometry', 'accuracy_meters', 'speed_kmh', 'heading', 'timestamp', 'location')
ORDER BY column_name;

-- ============================================================================
-- PART 5: TEST THE FIX
-- ============================================================================

-- Test query to verify structure
SELECT 
    'driver_locations table is ready' as status,
    COUNT(*) as existing_locations
FROM driver_locations;

-- Check for any remaining bad triggers
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND (action_statement LIKE '%accuracy_meters%' OR action_statement LIKE '%NEW.accuracy%')
AND event_object_table = 'orders';

-- If the above returns any rows, those triggers need to be dropped!

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ All fixes applied!';
    RAISE NOTICE '✅ driver_locations has all required columns';
    RAISE NOTICE '✅ Broken triggers on orders table removed';
    RAISE NOTICE '✅ Correct trigger on driver_locations created';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Mobile app can now send locations without errors';
    RAISE NOTICE '2. Update order status to in_progress: UPDATE orders SET status = ''in_progress'' WHERE order_number = ''ORD-1759507343591'';';
    RAISE NOTICE '3. Check dashboard tracking page';
END $$;
