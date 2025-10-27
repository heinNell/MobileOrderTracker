-- ESSENTIAL FIXES ONLY - Run this in Supabase SQL Editor
-- No optional tables, just the critical fixes
-- Order ID: 5b2b87ac-8dd7-4339-b28d-df2ec0b985cc

-- ============================================================================
-- FIX 1: LOCATION TRACKING TRIGGER (CRITICAL!)
-- ============================================================================

DROP TRIGGER IF EXISTS update_user_last_location_trigger ON public.driver_locations;
DROP FUNCTION IF EXISTS update_user_last_location();

CREATE OR REPLACE FUNCTION update_user_last_location()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    UPDATE public.users 
    SET 
      last_location_update = NEW.created_at,
      last_driver_location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)
    WHERE id = NEW.driver_id;
  EXCEPTION
    WHEN OTHERS THEN
      UPDATE public.users 
      SET last_location_update = NEW.created_at
      WHERE id = NEW.driver_id;
      RAISE WARNING 'Failed to update geometry for user %: %', NEW.driver_id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_last_location_trigger
  AFTER INSERT ON public.driver_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_location();

SELECT '✅ Fix 1 Complete: Location tracking trigger fixed!' AS status;

-- ============================================================================
-- FIX 2: ORDER STATUS VALUE (CRITICAL!)
-- ============================================================================

-- Update the current order
UPDATE public.orders
SET 
  status = 'activated',
  updated_at = NOW()
WHERE id = '5b2b87ac-8dd7-4339-b28d-df2ec0b985cc'
  AND load_activated_at IS NOT NULL;

-- Update all affected orders
UPDATE public.orders
SET 
  status = 'activated',
  updated_at = NOW()
WHERE load_activated_at IS NOT NULL
  AND status = 'active'
  AND assigned_driver_id IS NOT NULL;

SELECT '✅ Fix 2 Complete: Order status updated!' AS status;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify current order is fixed
SELECT 
  'Current Order Status' AS check_type,
  id,
  order_number,
  status,
  load_activated_at,
  tracking_active,
  CASE 
    WHEN status = 'activated' AND load_activated_at IS NOT NULL 
    THEN '✅ FIXED - StatusUpdateButtons will show'
    ELSE '❌ Still broken - Status: ' || status
  END AS result
FROM public.orders
WHERE id = '5b2b87ac-8dd7-4339-b28d-df2ec0b985cc';

-- Check how many orders were fixed
SELECT 
  COUNT(*) AS total_orders_fixed,
  '✅ Orders updated to activated status' AS description
FROM public.orders
WHERE status = 'activated'
  AND load_activated_at IS NOT NULL
  AND updated_at > NOW() - INTERVAL '5 minutes';

-- Verify trigger exists
SELECT 
  '✅ Trigger exists' AS status,
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'update_user_last_location_trigger'
  AND event_object_table = 'driver_locations';

-- Final summary
SELECT 
  '=== FIXES APPLIED SUCCESSFULLY ===' AS summary,
  NOW() AS completed_at;

-- Test location insert (optional - comment out if you don't want to test)
-- This inserts and immediately deletes a test location
/*
DO $$
DECLARE
  test_location_id UUID;
BEGIN
  INSERT INTO public.driver_locations (
    driver_id,
    order_id,
    latitude,
    longitude,
    timestamp,
    created_at
  ) VALUES (
    '1e8658c9-12f1-4e86-be55-b0b1219b7eba',
    '5b2b87ac-8dd7-4339-b28d-df2ec0b985cc',
    -25.8125,
    28.2035,
    NOW(),
    NOW()
  ) RETURNING id INTO test_location_id;
  
  RAISE NOTICE 'Test location inserted with ID: %', test_location_id;
  
  -- Clean up test data
  DELETE FROM public.driver_locations WHERE id = test_location_id;
  
  RAISE NOTICE '✅ Location tracking test passed!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Location tracking test failed: %', SQLERRM;
END $$;
*/
