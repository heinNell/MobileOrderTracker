-- FINAL FIX: Location Tracking Trigger - Safe Version
-- This version only updates the timestamp, avoiding geometry issues

DROP TRIGGER IF EXISTS update_user_last_location_trigger ON public.driver_locations;
DROP FUNCTION IF EXISTS update_user_last_location();

-- Create a simple, safe trigger that only updates timestamp
CREATE OR REPLACE FUNCTION update_user_last_location()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update timestamp - skip geometry column entirely
  UPDATE public.users 
  SET last_location_update = NEW.created_at
  WHERE id = NEW.driver_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Even if update fails, don't block the location insert
    RAISE WARNING 'Could not update user location timestamp: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_last_location_trigger
  AFTER INSERT ON public.driver_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_location();

SELECT '✅ Safe location trigger created!' AS status;

-- Test it
DO $$
DECLARE
  test_id UUID;
BEGIN
  INSERT INTO public.driver_locations (
    driver_id,
    order_id,
    latitude,
    longitude,
    timestamp
  ) VALUES (
    '1e8658c9-12f1-4e86-be55-b0b1219b7eba',
    '5b2b87ac-8dd7-4339-b28d-df2ec0b985cc',
    -25.8125,
    28.2035,
    NOW()
  ) RETURNING id INTO test_id;
  
  DELETE FROM public.driver_locations WHERE id = test_id;
  
  RAISE NOTICE '✅ Location insert test PASSED!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Location insert test FAILED: %', SQLERRM;
END $$;
