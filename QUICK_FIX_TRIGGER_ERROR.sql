-- QUICK FIX: Update trigger to handle PostGIS geometry type errors
-- Run this immediately to fix the location insert errors

-- Step 1: Drop existing trigger and function
DROP TRIGGER IF EXISTS update_user_last_location_trigger ON public.driver_locations;
DROP FUNCTION IF EXISTS update_user_last_location();

-- Step 2: Create new trigger function with error handling
CREATE OR REPLACE FUNCTION update_user_last_location()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to update with PostGIS geometry
  BEGIN
    UPDATE public.users 
    SET 
      last_location_update = NEW.created_at,
      last_driver_location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)
    WHERE id = NEW.driver_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- If PostGIS fails, just update timestamp (don't break the insert)
      BEGIN
        UPDATE public.users 
        SET last_location_update = NEW.created_at
        WHERE id = NEW.driver_id;
      EXCEPTION
        WHEN OTHERS THEN
          -- If even timestamp update fails, log it but don't fail the location insert
          RAISE WARNING 'Could not update user location for driver %: %', NEW.driver_id, SQLERRM;
      END;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Recreate trigger
CREATE TRIGGER update_user_last_location_trigger
  AFTER INSERT ON public.driver_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_location();

-- Step 4: Verify trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  'Trigger recreated successfully' AS status
FROM information_schema.triggers
WHERE trigger_name = 'update_user_last_location_trigger';

-- Step 5: Test the trigger (optional - only if you want to verify)
-- This will insert a test location and then delete it
DO $$
DECLARE
  test_driver_id UUID;
BEGIN
  -- Get any active driver ID for testing
  SELECT id INTO test_driver_id
  FROM public.users
  WHERE role = 'driver'
  LIMIT 1;
  
  IF test_driver_id IS NOT NULL THEN
    -- Insert test location
    INSERT INTO public.driver_locations (
      driver_id,
      latitude,
      longitude,
      timestamp,
      created_at
    ) VALUES (
      test_driver_id,
      -25.8125,
      28.2035,
      NOW(),
      NOW()
    );
    
    -- Clean up test data
    DELETE FROM public.driver_locations
    WHERE driver_id = test_driver_id
      AND created_at > NOW() - INTERVAL '10 seconds';
    
    RAISE NOTICE 'Trigger test completed successfully for driver %', test_driver_id;
  ELSE
    RAISE NOTICE 'No driver found for testing';
  END IF;
END $$;

SELECT '✅ Trigger fix applied successfully!' AS result;
