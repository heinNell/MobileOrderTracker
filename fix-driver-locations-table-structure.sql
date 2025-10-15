-- Fix driver_locations table structure to match what the mobile app is sending
-- Based on error logs, we need both individual lat/lng columns AND a JSONB location field

-- First check current table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'driver_locations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add the missing JSONB location column if it doesn't exist
-- This is what the mobile app is trying to insert based on debug logs
DO $$
BEGIN
    -- Check if location column exists and add it if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'driver_locations' 
        AND column_name = 'location' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.driver_locations 
        ADD COLUMN location JSONB;
        
        RAISE NOTICE 'Added location JSONB column to driver_locations table';
    ELSE
        RAISE NOTICE 'location column already exists';
    END IF;

    -- Ensure other required columns exist with correct types
    -- Add accuracy_meters if missing (mobile app sends this)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'driver_locations' 
        AND column_name = 'accuracy_meters' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.driver_locations 
        ADD COLUMN accuracy_meters NUMERIC;
        
        RAISE NOTICE 'Added accuracy_meters column';
    END IF;

    -- Add speed_kmh if missing (mobile app sends this)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'driver_locations' 
        AND column_name = 'speed_kmh' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.driver_locations 
        ADD COLUMN speed_kmh NUMERIC;
        
        RAISE NOTICE 'Added speed_kmh column';
    END IF;

END $$;

-- Create a function to validate location JSONB structure
-- This will help catch any issues with malformed location data
CREATE OR REPLACE FUNCTION validate_location_jsonb(location_data JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if location_data has required lat and lng properties
    IF location_data IS NULL THEN
        RETURN TRUE; -- Allow NULL
    END IF;
    
    -- Check if it has lat and lng keys
    IF NOT (location_data ? 'lat' AND location_data ? 'lng') THEN
        RAISE EXCEPTION 'Location JSONB must contain lat and lng properties';
    END IF;
    
    -- Check if lat and lng are valid numbers
    IF NOT (
        jsonb_typeof(location_data->'lat') = 'number' AND
        jsonb_typeof(location_data->'lng') = 'number'
    ) THEN
        RAISE EXCEPTION 'Location lat and lng must be numbers, got lat: %, lng: %', 
            jsonb_typeof(location_data->'lat'), 
            jsonb_typeof(location_data->'lng');
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add a check constraint to validate location JSONB structure
-- This will prevent invalid location data from being inserted
DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE public.driver_locations 
    DROP CONSTRAINT IF EXISTS check_location_structure;
    
    -- Add new constraint with validation function
    ALTER TABLE public.driver_locations 
    ADD CONSTRAINT check_location_structure 
    CHECK (validate_location_jsonb(location));
    
    RAISE NOTICE 'Added location JSONB validation constraint';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add constraint: %', SQLERRM;
END $$;

-- Create a trigger to auto-populate the location JSONB field from lat/lng if it's missing
CREATE OR REPLACE FUNCTION auto_populate_location_jsonb()
RETURNS TRIGGER AS $$
BEGIN
    -- If location JSONB is null but lat/lng are provided, create the JSONB
    IF NEW.location IS NULL AND NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location = jsonb_build_object('lat', NEW.latitude, 'lng', NEW.longitude);
    END IF;
    
    -- If location JSONB is provided but lat/lng are null, populate them
    IF NEW.location IS NOT NULL AND (NEW.latitude IS NULL OR NEW.longitude IS NULL) THEN
        IF NEW.location ? 'lat' AND NEW.location ? 'lng' THEN
            NEW.latitude = (NEW.location->>'lat')::NUMERIC;
            NEW.longitude = (NEW.location->>'lng')::NUMERIC;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger (only if it doesn't exist)
DO $$
BEGIN
    DROP TRIGGER IF EXISTS auto_populate_location_trigger ON public.driver_locations;
    
    CREATE TRIGGER auto_populate_location_trigger
        BEFORE INSERT OR UPDATE ON public.driver_locations
        FOR EACH ROW
        EXECUTE FUNCTION auto_populate_location_jsonb();
        
    RAISE NOTICE 'Created auto_populate_location_trigger';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not create trigger: %', SQLERRM;
END $$;

-- Show final table structure
SELECT 'Final table structure:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'driver_locations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test insert to verify everything works
SELECT 'Testing table structure...' as test_info;

-- This query will test if the structure matches what the mobile app is sending
INSERT INTO public.driver_locations (
    driver_id,
    order_id,
    latitude,
    longitude,
    location,
    accuracy,
    accuracy_meters,
    speed,
    speed_kmh,
    heading,
    timestamp,
    created_at,
    is_manual_update,
    notes
) VALUES (
    '5e5ebf46-d35f-4dc4-9025-28fdf81059fd', -- Test driver ID
    NULL, -- Test order ID
    -25.8080768,
    28.1935872,
    '{"lat": -25.8080768, "lng": 28.1935872}'::jsonb,
    980.5533143757976,
    980.5533143757976,
    NULL,
    NULL,
    NULL,
    NOW(),
    NOW(),
    true,
    'Test location update to verify table structure'
) ON CONFLICT DO NOTHING;

SELECT 'Test insert completed successfully' as result;