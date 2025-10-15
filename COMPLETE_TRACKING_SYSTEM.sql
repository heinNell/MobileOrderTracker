-- Complete Tracking System with Analytics and Auto-Stop
-- This fixes geometry data, adds trip analytics, and implements auto-stop tracking
-- Run this in Supabase SQL Editor

-- ============================================================================
-- 1. ENSURE POSTGIS EXTENSION IS ENABLED
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- 2. ADD TRIP ANALYTICS COLUMNS TO ORDERS TABLE
-- ============================================================================

-- Add columns to store trip metrics
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS trip_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trip_end_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_distance_km NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS total_duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS average_speed_kmh NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS tracking_active BOOLEAN DEFAULT FALSE;

-- Add geometry column for current driver location if not exists
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
-- 3. ENSURE DRIVER_LOCATIONS HAS GEOMETRY COLUMN
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'driver_locations' 
        AND column_name = 'geometry'
    ) THEN
        ALTER TABLE public.driver_locations ADD COLUMN geometry geometry(Point, 4326);
    END IF;
END $$;

-- Create index on geometry for performance
CREATE INDEX IF NOT EXISTS idx_driver_locations_geometry 
ON public.driver_locations USING GIST (geometry);

-- ============================================================================
-- 4. FUNCTION TO CALCULATE DISTANCE BETWEEN TWO POINTS (HAVERSINE)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_distance_km(
    lat1 NUMERIC, lon1 NUMERIC,
    lat2 NUMERIC, lon2 NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
    r NUMERIC := 6371; -- Earth's radius in kilometers
    dlat NUMERIC;
    dlon NUMERIC;
    a NUMERIC;
    c NUMERIC;
BEGIN
    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
        RETURN 0;
    END IF;
    
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    
    a := sin(dlat / 2) * sin(dlat / 2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dlon / 2) * sin(dlon / 2);
    
    c := 2 * atan2(sqrt(a), sqrt(1 - a));
    
    RETURN r * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 5. FUNCTION TO CALCULATE TRIP ANALYTICS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_trip_analytics(p_order_id UUID)
RETURNS TABLE(
    total_distance_km NUMERIC,
    total_duration_minutes INTEGER,
    average_speed_kmh NUMERIC,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    location_count INTEGER
) AS $$
DECLARE
    v_total_distance NUMERIC := 0;
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
    v_duration_minutes INTEGER;
    v_avg_speed NUMERIC;
    v_location_count INTEGER;
    v_prev_lat NUMERIC;
    v_prev_lng NUMERIC;
    v_prev_time TIMESTAMPTZ;
BEGIN
    -- Get all locations for this order, ordered by time
    FOR v_prev_lat, v_prev_lng, v_prev_time IN
        SELECT latitude, longitude, created_at
        FROM public.driver_locations
        WHERE order_id = p_order_id
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
        ORDER BY created_at ASC
    LOOP
        IF v_start_time IS NULL THEN
            v_start_time := v_prev_time;
        ELSE
            -- Calculate distance from previous point
            v_total_distance := v_total_distance + calculate_distance_km(
                LAG(v_prev_lat) OVER (ORDER BY v_prev_time),
                LAG(v_prev_lng) OVER (ORDER BY v_prev_time),
                v_prev_lat,
                v_prev_lng
            );
        END IF;
        
        v_end_time := v_prev_time;
    END LOOP;
    
    -- Calculate duration in minutes
    IF v_start_time IS NOT NULL AND v_end_time IS NOT NULL THEN
        v_duration_minutes := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) / 60;
    ELSE
        v_duration_minutes := 0;
    END IF;
    
    -- Calculate average speed
    IF v_duration_minutes > 0 THEN
        v_avg_speed := (v_total_distance / v_duration_minutes) * 60; -- km/h
    ELSE
        v_avg_speed := 0;
    END IF;
    
    -- Get location count
    SELECT COUNT(*) INTO v_location_count
    FROM public.driver_locations
    WHERE order_id = p_order_id;
    
    RETURN QUERY SELECT 
        v_total_distance,
        v_duration_minutes,
        v_avg_speed,
        v_start_time,
        v_end_time,
        v_location_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. TRIGGER TO UPDATE GEOMETRY WHEN LOCATION IS INSERTED
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

-- Create trigger
CREATE TRIGGER trigger_sync_driver_location_geometry
    BEFORE INSERT ON public.driver_locations
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_driver_location_geometry();

-- ============================================================================
-- 7. FUNCTION TO START TRACKING (CALLED WHEN ORDER STATUS CHANGES)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.start_tracking()
RETURNS TRIGGER AS $$
BEGIN
    -- Start tracking when status changes to 'in_progress' or 'in_transit'
    IF NEW.status IN ('in_progress', 'in_transit', 'loaded') 
       AND OLD.status NOT IN ('in_progress', 'in_transit', 'loaded') THEN
        
        NEW.tracking_active := TRUE;
        NEW.trip_start_time := COALESCE(NEW.trip_start_time, NOW());
        
        RAISE NOTICE 'Tracking started for order %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. FUNCTION TO STOP TRACKING AND CALCULATE ANALYTICS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.stop_tracking_and_calculate()
RETURNS TRIGGER AS $$
DECLARE
    v_analytics RECORD;
BEGIN
    -- Stop tracking when status changes to 'completed' or 'unloading'
    IF NEW.status IN ('completed', 'unloading') 
       AND OLD.tracking_active = TRUE 
       AND NEW.tracking_active = TRUE THEN
        
        NEW.tracking_active := FALSE;
        NEW.trip_end_time := NOW();
        
        -- Calculate trip analytics
        SELECT * INTO v_analytics
        FROM public.calculate_trip_analytics(NEW.id);
        
        -- Store analytics in order
        NEW.total_distance_km := v_analytics.total_distance_km;
        NEW.total_duration_minutes := v_analytics.total_duration_minutes;
        NEW.average_speed_kmh := v_analytics.average_speed_kmh;
        
        RAISE NOTICE 'Tracking stopped for order %. Distance: % km, Duration: % min, Avg Speed: % km/h',
            NEW.id, 
            NEW.total_distance_km, 
            NEW.total_duration_minutes,
            NEW.average_speed_kmh;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_start_tracking ON public.orders;
DROP TRIGGER IF EXISTS trigger_stop_tracking ON public.orders;

-- Create triggers
CREATE TRIGGER trigger_start_tracking
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.start_tracking();

CREATE TRIGGER trigger_stop_tracking
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.stop_tracking_and_calculate();

-- ============================================================================
-- 9. VIEW FOR CURRENT DRIVER LOCATIONS WITH GEOMETRY
-- ============================================================================

CREATE OR REPLACE VIEW public.current_driver_locations AS
SELECT DISTINCT ON (driver_id)
    dl.id,
    dl.driver_id,
    dl.order_id,
    dl.latitude,
    dl.longitude,
    dl.geometry,
    dl.accuracy_meters,
    dl.speed_kmh,
    dl.heading,
    dl.created_at,
    dl.timestamp,
    u.full_name as driver_name,
    u.email as driver_email,
    o.order_number,
    o.status as order_status,
    o.tracking_active
FROM public.driver_locations dl
LEFT JOIN public.users u ON u.id = dl.driver_id
LEFT JOIN public.orders o ON o.id = dl.order_id
ORDER BY dl.driver_id, dl.created_at DESC;

-- ============================================================================
-- 10. FUNCTION TO GET TRACKING LINK DATA (FOR PUBLIC SHARING)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_tracking_data(p_order_id UUID)
RETURNS TABLE(
    order_id UUID,
    order_number TEXT,
    status TEXT,
    loading_point_name TEXT,
    unloading_point_name TEXT,
    driver_name TEXT,
    current_lat NUMERIC,
    current_lng NUMERIC,
    current_geometry geometry,
    tracking_active BOOLEAN,
    trip_start_time TIMESTAMPTZ,
    total_distance_km NUMERIC,
    total_duration_minutes INTEGER,
    average_speed_kmh NUMERIC,
    last_update TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.order_number,
        o.status,
        o.loading_point_name,
        o.unloading_point_name,
        u.full_name,
        (o.last_driver_location->>'lat')::NUMERIC,
        (o.last_driver_location->>'lng')::NUMERIC,
        o.current_driver_geometry,
        o.tracking_active,
        o.trip_start_time,
        o.total_distance_km,
        o.total_duration_minutes,
        o.average_speed_kmh,
        (o.last_driver_location->>'timestamp')::TIMESTAMPTZ
    FROM public.orders o
    LEFT JOIN public.users u ON u.id = o.assigned_driver_id
    WHERE o.id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 11. RLS POLICY FOR PUBLIC TRACKING ACCESS
-- ============================================================================

-- Allow public read access to tracking data for active orders
DROP POLICY IF EXISTS "Public can view active order tracking" ON public.orders;

CREATE POLICY "Public can view active order tracking"
ON public.orders
FOR SELECT
TO anon
USING (
    status IN ('in_progress', 'in_transit', 'loaded', 'unloading')
    AND tracking_active = TRUE
);

-- Allow public read access to driver_locations for active orders
DROP POLICY IF EXISTS "Public can view driver locations for active orders" ON public.driver_locations;

CREATE POLICY "Public can view driver locations for active orders"
ON public.driver_locations
FOR SELECT
TO anon
USING (
    order_id IN (
        SELECT id FROM public.orders 
        WHERE tracking_active = TRUE
    )
);

-- ============================================================================
-- 12. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_orders_tracking_active 
ON public.orders(tracking_active) 
WHERE tracking_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_orders_current_driver_geometry 
ON public.orders USING GIST (current_driver_geometry)
WHERE current_driver_geometry IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_driver_locations_order_id_created 
ON public.driver_locations(order_id, created_at DESC);

-- ============================================================================
-- 13. BACKFILL EXISTING DATA
-- ============================================================================

-- Update geometry for existing driver_locations
UPDATE public.driver_locations
SET geometry = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL 
  AND geometry IS NULL;

-- Update current_driver_geometry for orders with recent locations
UPDATE public.orders o
SET current_driver_geometry = (
    SELECT ST_SetSRID(ST_MakePoint(dl.longitude, dl.latitude), 4326)
    FROM public.driver_locations dl
    WHERE dl.order_id = o.id
      AND dl.latitude IS NOT NULL
      AND dl.longitude IS NOT NULL
    ORDER BY dl.created_at DESC
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1 FROM public.driver_locations dl
    WHERE dl.order_id = o.id
);

-- Set tracking_active for orders in transit
UPDATE public.orders
SET tracking_active = TRUE
WHERE status IN ('in_progress', 'in_transit', 'loaded')
  AND tracking_active IS NULL;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Complete tracking system deployed:';
    RAISE NOTICE '   - Geometry fields added and indexed';
    RAISE NOTICE '   - Trip analytics functions created';
    RAISE NOTICE '   - Auto-start/stop tracking triggers deployed';
    RAISE NOTICE '   - Distance calculation: Haversine formula';
    RAISE NOTICE '   - Public tracking API function created';
    RAISE NOTICE '   - RLS policies for public access configured';
    RAISE NOTICE '';
    RAISE NOTICE '📊 New features:';
    RAISE NOTICE '   - Automatic tracking start on order activation';
    RAISE NOTICE '   - Automatic tracking stop on completion/unloading';
    RAISE NOTICE '   - Real-time distance and time calculation';
    RAISE NOTICE '   - Public shareable tracking links';
    RAISE NOTICE '   - Geometry-based location queries';
    RAISE NOTICE '';
    RAISE NOTICE '🔗 Usage:';
    RAISE NOTICE '   - Shareable link: /tracking/[order_id]/public';
    RAISE NOTICE '   - Get tracking data: SELECT * FROM get_tracking_data(order_id)';
    RAISE NOTICE '   - Current locations: SELECT * FROM current_driver_locations';
END $$;
