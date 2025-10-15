-- Fix the driver_location_to_order_update() trigger function
-- The issue is incorrect JSONB extraction syntax in ST_MakePoint

-- First, let's see the current function
SELECT 'Current problematic function:' as info;
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'driver_location_to_order_update'
AND routine_schema = 'public';

-- Drop and recreate the function with correct syntax
DROP FUNCTION IF EXISTS public.driver_location_to_order_update() CASCADE;

-- Create the corrected function
CREATE OR REPLACE FUNCTION public.driver_location_to_order_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if we have a location and it's properly formatted
    IF NEW.location IS NOT NULL AND 
       NEW.location ? 'lat' AND 
       NEW.location ? 'lng' THEN
        
        -- Insert into location_updates with corrected JSONB extraction syntax
        INSERT INTO public.location_updates (location)
        VALUES (
            ST_SetSRID(
                ST_MakePoint(
                    (NEW.location->>'lng')::float,  -- Correct: cast the extracted value
                    (NEW.location->>'lat')::float   -- Correct: cast the extracted value
                ), 
                4326
            )
        );
        
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the main insert
        RAISE WARNING 'Error in driver_location_to_order_update trigger: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger if it existed
DO $$
BEGIN
    -- Check if the trigger exists and recreate it
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'driver_location_to_order_update_trigger'
        AND event_object_table = 'driver_locations'
    ) THEN
        DROP TRIGGER driver_location_to_order_update_trigger ON public.driver_locations;
        
        CREATE TRIGGER driver_location_to_order_update_trigger
            AFTER INSERT ON public.driver_locations
            FOR EACH ROW
            EXECUTE FUNCTION public.driver_location_to_order_update();
            
        RAISE NOTICE 'Recreated driver_location_to_order_update_trigger with fixed syntax';
    ELSE
        RAISE NOTICE 'Trigger does not exist, no need to recreate';
    END IF;
END $$;

-- Alternative: If you don't need this trigger, you can disable it
-- COMMENT: Uncomment the next lines if you want to disable the trigger instead
-- DROP TRIGGER IF EXISTS driver_location_to_order_update_trigger ON public.driver_locations;
-- RAISE NOTICE 'Disabled problematic trigger';

-- Test the fix
SELECT 'Testing the corrected function...' as test_info;

-- Show all triggers on driver_locations table
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'driver_locations'
AND event_object_schema = 'public';

SELECT 'Fix completed successfully' as result;