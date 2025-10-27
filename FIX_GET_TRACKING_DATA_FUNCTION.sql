-- Fix get_tracking_data function to handle geometry columns correctly
-- This resolves the "operator does not exist: geometry ->> unknown" error

-- Drop the existing function first since we're changing the return type
DROP FUNCTION IF EXISTS public.get_tracking_data(UUID);

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
    tracking_active BOOLEAN,
    trip_start_time TIMESTAMPTZ,
    total_distance_km NUMERIC,
    total_duration_minutes INTEGER,
    average_speed_kmh NUMERIC,
    last_update TIMESTAMPTZ,
    -- Add coordinate columns for loading/unloading points
    loading_point_latitude NUMERIC,
    loading_point_longitude NUMERIC,
    unloading_point_latitude NUMERIC,
    unloading_point_longitude NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.order_number,
        o.status::TEXT,
        o.loading_point_name,
        o.unloading_point_name,
        u.full_name,
        -- Get current location from latest driver_location record
        COALESCE(dl.latitude, 0)::NUMERIC,
        COALESCE(dl.longitude, 0)::NUMERIC,
        COALESCE(o.tracking_active, FALSE),
        o.actual_start_time,
        COALESCE(o.total_distance_km, 0),
        COALESCE(o.total_duration_minutes, 0),
        COALESCE(o.average_speed_kmh, 0),
        COALESCE(dl.created_at, o.updated_at),
        -- Extract coordinates from PostGIS geography points
        CASE 
            WHEN o.loading_point_location IS NOT NULL 
            THEN ST_Y(o.loading_point_location::geometry)
            ELSE 0
        END::NUMERIC,
        CASE 
            WHEN o.loading_point_location IS NOT NULL 
            THEN ST_X(o.loading_point_location::geometry)
            ELSE 0
        END::NUMERIC,
        CASE 
            WHEN o.unloading_point_location IS NOT NULL 
            THEN ST_Y(o.unloading_point_location::geometry)
            ELSE 0
        END::NUMERIC,
        CASE 
            WHEN o.unloading_point_location IS NOT NULL 
            THEN ST_X(o.unloading_point_location::geometry)
            ELSE 0
        END::NUMERIC
    FROM public.orders o
    LEFT JOIN public.users u ON u.id = o.assigned_driver_id
    LEFT JOIN LATERAL (
        SELECT dl_sub.latitude, dl_sub.longitude, dl_sub.created_at
        FROM public.driver_locations dl_sub
        WHERE dl_sub.order_id = o.id
          AND dl_sub.latitude IS NOT NULL
          AND dl_sub.longitude IS NOT NULL
        ORDER BY dl_sub.created_at DESC
        LIMIT 1
    ) dl ON TRUE
    WHERE o.id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_tracking_data(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_tracking_data(UUID) TO authenticated;

SELECT '✅ Function get_tracking_data fixed successfully' AS status;

-- Test the function
SELECT * FROM public.get_tracking_data('5b2b87ac-8dd7-4339-b28d-df2ec0b985cc'::UUID);
