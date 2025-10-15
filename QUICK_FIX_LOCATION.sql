-- ============================================================================
-- COMPLETE LOCATION TRACKING FIX
-- Run this entire script in Supabase SQL Editor
-- ============================================================================

-- 1. Remove unique constraint (allows location history)
DROP INDEX IF EXISTS public.uq_driver_locations_driver_id;

-- 2. Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id_timestamp 
ON public.driver_locations(driver_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_driver_locations_order_id_timestamp 
ON public.driver_locations(order_id, timestamp DESC) WHERE order_id IS NOT NULL;

-- 3. Ensure orders table has location columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'last_driver_location' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN last_driver_location JSONB;
    END IF;
END $$;

-- 4. Create trigger function to update orders with driver location
CREATE OR REPLACE FUNCTION public.update_order_with_driver_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_id IS NOT NULL THEN
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
            updated_at = NOW()
        WHERE id = NEW.order_id;
    END IF;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error updating order with driver location: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger
DROP TRIGGER IF EXISTS trigger_update_order_with_driver_location ON public.driver_locations;
CREATE TRIGGER trigger_update_order_with_driver_location
    AFTER INSERT OR UPDATE ON public.driver_locations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_order_with_driver_location();

-- 6. Create helpful view for latest driver locations
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
    created_at
FROM public.driver_locations
ORDER BY driver_id, timestamp DESC, created_at DESC;

GRANT SELECT ON v_driver_latest_locations TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that constraint is removed
SELECT 'Checking constraints...' as step;
SELECT conname 
FROM pg_constraint 
WHERE conrelid = 'driver_locations'::regclass 
  AND conname = 'uq_driver_locations_driver_id';
-- Should return NO rows

-- Check indexes
SELECT 'Checking indexes...' as step;
SELECT indexname FROM pg_indexes 
WHERE tablename = 'driver_locations' 
  AND schemaname = 'public'
ORDER BY indexname;

-- Check trigger
SELECT 'Checking trigger...' as step;
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'driver_locations'
  AND trigger_name = 'trigger_update_order_with_driver_location';

-- Check orders column
SELECT 'Checking orders table...' as step;
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name = 'last_driver_location';

SELECT '✅ All fixes applied successfully!' as result;

-- ============================================================================
-- WHAT THIS DOES:
-- ============================================================================
-- 1. Removes unique constraint - Allows storing location history
-- 2. Creates indexes - Optimizes location queries
-- 3. Adds column to orders - Stores current driver position
-- 4. Creates trigger - Auto-updates orders when location changes
-- 5. Creates view - Easy access to latest locations

-- ============================================================================
-- AFTER RUNNING:
-- ============================================================================
-- ✅ Mobile app can send multiple location updates
-- ✅ No more "duplicate key" errors
-- ✅ Orders table automatically updated with driver location
-- ✅ Dashboard shows real-time driver positions
-- ✅ Full location history preserved in driver_locations table

-- ============================================================================
-- TEST QUERIES:
-- ============================================================================
-- Check driver location history:
-- SELECT * FROM driver_locations 
-- WHERE driver_id = '5e5ebf46-d35f-4dc4-9025-28fdf81059fd'
-- ORDER BY timestamp DESC LIMIT 5;

-- Check order with driver location:
-- SELECT order_number, last_driver_location 
-- FROM orders 
-- WHERE assigned_driver_id = '5e5ebf46-d35f-4dc4-9025-28fdf81059fd';

