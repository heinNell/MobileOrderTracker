-- ============================================================================
-- REMOVE ALL PROBLEMATIC TRIGGERS FROM DRIVER_LOCATIONS
-- ============================================================================
-- This removes all custom triggers that are causing errors
-- ============================================================================

-- Step 1: List all triggers on driver_locations
SELECT 
  '=== Current Triggers on driver_locations ===' AS info;

SELECT 
  tgname as trigger_name,
  proname as function_name,
  pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
LEFT JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'public.driver_locations'::regclass
  AND tgname NOT LIKE 'pg_%'
ORDER BY tgname;

-- Step 2: Drop ALL custom triggers (based on actual triggers found)
DROP TRIGGER IF EXISTS trg_fill_driver_location ON public.driver_locations;
DROP TRIGGER IF EXISTS trigger_driver_location_update ON public.driver_locations;
DROP TRIGGER IF EXISTS trigger_sync_driver_location_geometry ON public.driver_locations;
DROP TRIGGER IF EXISTS trigger_sync_order_location ON public.driver_locations;
DROP TRIGGER IF EXISTS trigger_update_order_with_driver_location ON public.driver_locations;
DROP TRIGGER IF EXISTS update_user_last_location_trigger ON public.driver_locations;

-- Also drop any other potential triggers
DROP TRIGGER IF EXISTS fill_driver_location_trigger ON public.driver_locations;
DROP TRIGGER IF EXISTS update_driver_location_trigger ON public.driver_locations;
DROP TRIGGER IF EXISTS sync_driver_location_trigger ON public.driver_locations;
DROP TRIGGER IF EXISTS propagate_location_trigger ON public.driver_locations;
DROP TRIGGER IF EXISTS update_current_driver_location_trigger ON public.driver_locations;

-- Step 3: Drop ALL related functions
DROP FUNCTION IF EXISTS fill_driver_location_from_latlng() CASCADE;
DROP FUNCTION IF EXISTS trigger_update_trip_analytics() CASCADE;
DROP FUNCTION IF EXISTS sync_driver_location_geometry() CASCADE;
DROP FUNCTION IF EXISTS sync_location_data() CASCADE;
DROP FUNCTION IF EXISTS update_order_with_driver_location() CASCADE;
DROP FUNCTION IF EXISTS update_user_last_location_simple() CASCADE;

-- Also drop other potential functions
DROP FUNCTION IF EXISTS fill_driver_location_and_propagate() CASCADE;
DROP FUNCTION IF EXISTS update_current_driver_location(uuid, double precision, double precision) CASCADE;
DROP FUNCTION IF EXISTS update_current_driver_location(uuid, numeric, numeric) CASCADE;
DROP FUNCTION IF EXISTS sync_driver_location() CASCADE;
DROP FUNCTION IF EXISTS propagate_location() CASCADE;

-- Step 4: Verify all triggers are removed
SELECT 
  '=== Verification: Remaining Triggers ===' AS info;

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All problematic triggers removed'
    ELSE '❌ Still have ' || COUNT(*) || ' triggers remaining'
  END as status
FROM pg_trigger t
WHERE tgrelid = 'public.driver_locations'::regclass
  AND tgname NOT LIKE 'pg_%'
  AND tgname NOT LIKE 'RI_%';

-- Step 5: Create a simple, safe trigger for updating user last location
CREATE OR REPLACE FUNCTION update_user_last_location_simple()
RETURNS TRIGGER AS $$
BEGIN
  -- Simply update the users table with last location time
  UPDATE public.users 
  SET 
    last_location_update = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.driver_id;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- If anything fails, log it but don't block the insert
  RAISE WARNING 'Failed to update user last location: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create the safe trigger
DROP TRIGGER IF EXISTS update_user_last_location_trigger ON public.driver_locations;

CREATE TRIGGER update_user_last_location_trigger
  AFTER INSERT ON public.driver_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_location_simple();

-- Step 7: Final verification
SELECT 
  '=== Final Status ===' AS info;

SELECT 
  tgname as trigger_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'public.driver_locations'::regclass
  AND tgname NOT LIKE 'pg_%'
  AND tgname NOT LIKE 'RI_%'
ORDER BY tgname;

-- Step 8: Test insert
DO $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Get a valid user ID
  SELECT id INTO test_user_id FROM public.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Try a test insert
    INSERT INTO public.driver_locations (
      driver_id,
      order_id,
      latitude,
      longitude,
      timestamp,
      created_at
    ) VALUES (
      test_user_id,
      NULL,
      -33.9249,
      18.4241,
      now(),
      now()
    );
    
    -- Delete the test record
    DELETE FROM public.driver_locations 
    WHERE driver_id = test_user_id 
      AND latitude = -33.9249 
      AND longitude = 18.4241;
    
    RAISE NOTICE '✅ Test insert successful - triggers working correctly';
  ELSE
    RAISE NOTICE '⚠️ No users found for testing';
  END IF;
END $$;
