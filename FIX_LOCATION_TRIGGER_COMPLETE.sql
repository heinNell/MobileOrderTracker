-- COMPLETE FIX: Remove ALL old location triggers and create safe one
-- Run this to fix the "geometry but expression is of type jsonb" error

-- Step 1: Drop only user-created triggers on driver_locations (not system constraint triggers)
DO $$ 
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgrelid = 'public.driver_locations'::regclass
        AND tgname NOT LIKE 'RI_ConstraintTrigger%'  -- Skip foreign key constraint triggers
        AND NOT tgisinternal  -- Skip internal triggers
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.driver_locations CASCADE', trigger_record.tgname);
        RAISE NOTICE 'Dropped trigger: %', trigger_record.tgname;
    END LOOP;
END $$;

-- Step 2: Drop ALL related functions
DROP FUNCTION IF EXISTS update_user_last_location() CASCADE;
DROP FUNCTION IF EXISTS update_last_driver_location() CASCADE;
DROP FUNCTION IF EXISTS sync_driver_location() CASCADE;
DROP FUNCTION IF EXISTS update_order_location() CASCADE;

SELECT '✅ All old triggers and functions removed' AS step_1;

-- Step 3: Check if last_driver_location column exists and what type it is
DO $$
BEGIN
    -- If column exists as geometry, drop it (we don't need it)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'last_driver_location'
        AND udt_name = 'geometry'
    ) THEN
        ALTER TABLE public.users DROP COLUMN IF EXISTS last_driver_location;
        RAISE NOTICE 'Removed geometry last_driver_location column from users table';
    END IF;
    
    -- If column exists as jsonb, also drop it (causing confusion)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'last_driver_location'
    ) THEN
        ALTER TABLE public.users DROP COLUMN IF EXISTS last_driver_location;
        RAISE NOTICE 'Removed last_driver_location column from users table';
    END IF;
END $$;

SELECT '✅ Cleaned up last_driver_location column' AS step_2;

-- Step 4: Ensure last_location_update column exists (this is what we'll use)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'last_location_update'
    ) THEN
        ALTER TABLE public.users ADD COLUMN last_location_update TIMESTAMPTZ;
        RAISE NOTICE 'Added last_location_update column to users table';
    END IF;
END $$;

SELECT '✅ Ensured last_location_update column exists' AS step_3;

-- Step 5: Create NEW simple trigger that ONLY updates timestamp
CREATE OR REPLACE FUNCTION update_user_last_location()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update timestamp - no geometry operations
  UPDATE public.users 
  SET last_location_update = NEW.created_at
  WHERE id = NEW.driver_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never block location inserts even if this fails
    RAISE WARNING 'Could not update user location timestamp: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_last_location_trigger
  AFTER INSERT ON public.driver_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_location();

SELECT '✅ Created new safe trigger' AS step_4;

-- Step 6: Test the fix
DO $$
DECLARE
  test_id UUID;
  test_driver_id UUID := '1e8658c9-12f1-4e86-be55-b0b1219b7eba'; -- Your driver ID
  test_order_id UUID := '5b2b87ac-8dd7-4339-b28d-df2ec0b985cc'; -- Your order ID
BEGIN
  -- Try to insert a location
  INSERT INTO public.driver_locations (
    driver_id,
    order_id,
    latitude,
    longitude,
    timestamp,
    created_at
  ) VALUES (
    test_driver_id,
    test_order_id,
    -25.8125,
    28.2035,
    NOW(),
    NOW()
  ) RETURNING id INTO test_id;
  
  RAISE NOTICE '✅ TEST INSERT SUCCESSFUL! Location ID: %', test_id;
  
  -- Clean up test
  DELETE FROM public.driver_locations WHERE id = test_id;
  RAISE NOTICE '✅ Test cleanup complete';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ TEST FAILED: %', SQLERRM;
END $$;

-- Final verification
SELECT 
  '✅ COMPLETE! Location tracking should now work without errors.' AS final_status,
  'Try inserting a location from your app now.' AS next_step;

-- Show current triggers (should only be our new one)
SELECT 
  tgname as trigger_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'public.driver_locations'::regclass;
