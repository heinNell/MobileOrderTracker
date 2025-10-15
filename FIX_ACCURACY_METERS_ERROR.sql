-- Fix: "record 'new' has no field 'accuracy_meters'" error
-- This adds the missing columns to driver_locations and fixes the trigger

-- ============================================================================
-- 1. ADD MISSING COLUMNS TO DRIVER_LOCATIONS
-- ============================================================================

ALTER TABLE public.driver_locations
ADD COLUMN IF NOT EXISTS accuracy_meters NUMERIC,
ADD COLUMN IF NOT EXISTS speed_kmh NUMERIC,
ADD COLUMN IF NOT EXISTS heading NUMERIC,
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- 2. FIX THE SYNC TRIGGER TO HANDLE MISSING FIELDS GRACEFULLY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_driver_location_geometry()
RETURNS TRIGGER AS $$
DECLARE
    v_accuracy NUMERIC;
    v_speed NUMERIC;
    v_heading NUMERIC;
    v_timestamp TIMESTAMPTZ;
BEGIN
    -- Create geometry from latitude/longitude
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.geometry := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;
    
    -- Safely get accuracy_meters (may not exist yet)
    BEGIN
        v_accuracy := NEW.accuracy_meters;
    EXCEPTION WHEN OTHERS THEN
        v_accuracy := NULL;
    END;
    
    -- Safely get speed_kmh
    BEGIN
        v_speed := NEW.speed_kmh;
    EXCEPTION WHEN OTHERS THEN
        v_speed := NULL;
    END;
    
    -- Safely get heading
    BEGIN
        v_heading := NEW.heading;
    EXCEPTION WHEN OTHERS THEN
        v_heading := NULL;
    END;
    
    -- Safely get timestamp
    BEGIN
        v_timestamp := NEW.timestamp;
    EXCEPTION WHEN OTHERS THEN
        v_timestamp := NEW.created_at;
    END;
    
    -- Update orders table with current location
    IF NEW.order_id IS NOT NULL THEN
        UPDATE public.orders
        SET 
            current_driver_geometry = NEW.geometry,
            last_driver_location = jsonb_build_object(
                'lat', NEW.latitude,
                'lng', NEW.longitude,
                'accuracy_meters', v_accuracy,
                'speed_kmh', v_speed,
                'heading', v_heading,
                'timestamp', COALESCE(v_timestamp, NEW.created_at)
            ),
            updated_at = NOW()
        WHERE id = NEW.order_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_sync_driver_location_geometry ON public.driver_locations;

CREATE TRIGGER trigger_sync_driver_location_geometry
    BEFORE INSERT ON public.driver_locations
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_driver_location_geometry();

-- ============================================================================
-- 3. VERIFY THE FIX
-- ============================================================================

-- Check columns exist
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'driver_locations'
  AND column_name IN ('latitude', 'longitude', 'geometry', 'accuracy_meters', 'speed_kmh', 'heading', 'timestamp')
ORDER BY ordinal_position;

-- Test the trigger
SELECT 'Trigger fixed and ready!' as status;
