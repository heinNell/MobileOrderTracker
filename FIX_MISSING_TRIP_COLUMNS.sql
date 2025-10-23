-- Fix missing trip tracking columns in orders table
-- Error: Column "trip_start_time" does not exist

-- ============================================================================
-- STEP 1: CHECK CURRENT STATE OF ORDERS TABLE
-- ============================================================================

SELECT 
    '🔍 Checking orders table columns' as info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'orders'
  AND column_name IN (
    'trip_start_time',
    'trip_end_time', 
    'total_distance_km',
    'total_duration_minutes',
    'average_speed_kmh',
    'tracking_active',
    'current_driver_geometry'
  )
ORDER BY column_name;

-- ============================================================================
-- STEP 2: ADD MISSING TRIP TRACKING COLUMNS
-- ============================================================================

-- Add trip analytics columns
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS trip_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trip_end_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_distance_km NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS total_duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS average_speed_kmh NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS tracking_active BOOLEAN DEFAULT FALSE;

-- Add geometry column for current driver location
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'current_driver_geometry'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN current_driver_geometry geometry(Point, 4326);
    END IF;
END $$;

-- ============================================================================
-- STEP 3: VERIFY COLUMNS WERE ADDED
-- ============================================================================

SELECT 
    '✅ Trip tracking columns in orders table' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'orders'
  AND column_name IN (
    'trip_start_time',
    'trip_end_time', 
    'total_distance_km',
    'total_duration_minutes',
    'average_speed_kmh',
    'tracking_active',
    'current_driver_geometry'
  )
ORDER BY column_name;

-- ============================================================================
-- STEP 4: SET TRACKING_ACTIVE FOR IN-TRANSIT ORDERS
-- ============================================================================

-- Activate tracking for orders that are in transit
UPDATE public.orders
SET tracking_active = TRUE,
    trip_start_time = COALESCE(trip_start_time, NOW())
WHERE status IN ('in_progress', 'in_transit', 'loaded')
  AND (tracking_active IS NULL OR tracking_active = FALSE);

SELECT 
    '📊 Orders with tracking activated' as info,
    COUNT(*) as total_activated
FROM public.orders
WHERE tracking_active = TRUE;

-- ============================================================================
-- STEP 5: VERIFY calculate_trip_analytics FUNCTION EXISTS
-- ============================================================================

SELECT 
    '🔍 Check calculate_trip_analytics function' as info,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'calculate_trip_analytics';

-- ============================================================================
-- STEP 6: TEST THE FUNCTION (if it exists)
-- ============================================================================

-- Get a sample order with a driver assigned
DO $$
DECLARE
    v_order_id UUID;
    v_analytics RECORD;
BEGIN
    -- Find an order with driver locations
    SELECT DISTINCT order_id INTO v_order_id
    FROM public.driver_locations
    WHERE order_id IS NOT NULL
    LIMIT 1;
    
    IF v_order_id IS NOT NULL THEN
        -- Try to calculate analytics
        BEGIN
            SELECT * INTO v_analytics
            FROM public.calculate_trip_analytics(v_order_id);
            
            RAISE NOTICE '✅ calculate_trip_analytics works!';
            RAISE NOTICE 'Test Order: %', v_order_id;
            RAISE NOTICE 'Distance: % km', v_analytics.total_distance_km;
            RAISE NOTICE 'Duration: % minutes', v_analytics.total_duration_minutes;
            RAISE NOTICE 'Avg Speed: % km/h', v_analytics.average_speed_kmh;
            RAISE NOTICE 'Locations: %', v_analytics.location_count;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ calculate_trip_analytics function needs to be created';
            RAISE NOTICE 'Error: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'ℹ️ No orders with driver locations found for testing';
    END IF;
END $$;

-- ============================================================================
-- STEP 7: FINAL SUMMARY
-- ============================================================================

SELECT '✅ TRIP TRACKING COLUMNS ADDED!' as result;

SELECT
    '📊 Summary' as info,
    (SELECT COUNT(*) FROM public.orders WHERE tracking_active = TRUE) as orders_tracking_active,
    (SELECT COUNT(*) FROM public.driver_locations) as total_driver_locations,
    (SELECT COUNT(DISTINCT order_id) FROM public.driver_locations WHERE order_id IS NOT NULL) as orders_with_locations;

SELECT '⚠️ NEXT STEP: If calculate_trip_analytics failed, run COMPLETE_TRACKING_SYSTEM.sql' as next_action;
