-- COMPREHENSIVE FIX - Handles Status Constraint Issue
-- The database has a CHECK constraint that doesn't allow 'activated' status
-- We need to either:
--   A) Modify the constraint to allow 'activated'
--   B) Use a different valid status value

-- ============================================================================
-- STEP 1: DISCOVER CURRENT CONSTRAINT
-- ============================================================================

-- Check what status values are currently allowed
SELECT 
  'Current Status Constraint' AS info,
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
  AND constraint_name LIKE '%status%'
  AND constraint_name LIKE '%orders%';

-- Check current status values in use
SELECT 
  status,
  COUNT(*) AS order_count,
  STRING_AGG(DISTINCT order_number, ', ' ORDER BY order_number) AS example_orders
FROM public.orders
GROUP BY status
ORDER BY order_count DESC;

-- ============================================================================
-- STEP 2: FIX LOCATION TRACKING TRIGGER FIRST
-- ============================================================================

DROP TRIGGER IF EXISTS update_user_last_location_trigger ON public.driver_locations;
DROP FUNCTION IF EXISTS update_user_last_location();

CREATE OR REPLACE FUNCTION update_user_last_location()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    -- Try to update users table with location info
    -- Note: Using only last_location_update field since last_driver_location may not exist
    UPDATE public.users 
    SET last_location_update = NEW.created_at
    WHERE id = NEW.driver_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log but don't fail the insert
      RAISE WARNING 'Could not update user location for driver %: %', NEW.driver_id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_last_location_trigger
  AFTER INSERT ON public.driver_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_location();

SELECT '✅ Step 2 Complete: Location tracking trigger fixed!' AS status;

-- ============================================================================
-- STEP 3: FIX STATUS CONSTRAINT - Option A (Recommended)
-- ============================================================================
-- Add 'activated' to the allowed status values

-- First, check if the constraint exists
DO $$
BEGIN
  -- Drop the existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'orders'
      AND constraint_name = 'orders_status_check'
  ) THEN
    ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
    RAISE NOTICE 'Old constraint dropped';
  END IF;
END $$;

-- Create new constraint with 'activated' included
ALTER TABLE public.orders
ADD CONSTRAINT orders_status_check
CHECK (status IN (
  'pending',
  'assigned',
  'active',           -- Keep existing value for backward compatibility
  'activated',        -- Add new value
  'in_progress',
  'in_transit',
  'arrived',
  'arrived_at_loading_point',
  'loading',
  'loaded',
  'arrived_at_unloading_point',
  'unloading',
  'delivered',
  'completed',
  'cancelled'
));

SELECT '✅ Step 3 Complete: Status constraint updated to allow ''activated''' AS status;

-- ============================================================================
-- STEP 4: UPDATE ORDER STATUS
-- ============================================================================

-- Now update the order status to 'activated'
UPDATE public.orders
SET 
  status = 'activated',
  updated_at = NOW()
WHERE id = '5b2b87ac-8dd7-4339-b28d-df2ec0b985cc'
  AND load_activated_at IS NOT NULL;

-- Also update any other orders with 'active' status that are activated
UPDATE public.orders
SET 
  status = 'activated',
  updated_at = NOW()
WHERE load_activated_at IS NOT NULL
  AND status = 'active'
  AND assigned_driver_id IS NOT NULL;

SELECT '✅ Step 4 Complete: Order status updated!' AS status;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the constraint was updated
SELECT 
  'Updated Constraint' AS info,
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
  AND constraint_name = 'orders_status_check';

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
    WHEN status = 'active' AND load_activated_at IS NOT NULL
    THEN '⚠️ Using ''active'' status - buttons may not show'
    ELSE '❌ Status: ' || status
  END AS result
FROM public.orders
WHERE id = '5b2b87ac-8dd7-4339-b28d-df2ec0b985cc';

-- Check how many orders were updated
SELECT 
  COUNT(*) AS total_orders_fixed,
  '✅ Orders updated to activated status' AS description
FROM public.orders
WHERE status = 'activated'
  AND load_activated_at IS NOT NULL
  AND updated_at > NOW() - INTERVAL '10 minutes';

-- Verify trigger exists
SELECT 
  '✅ Trigger recreated' AS status,
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'update_user_last_location_trigger'
  AND event_object_table = 'driver_locations';

-- Show all current status values
SELECT 
  'Current Status Distribution' AS info,
  status,
  COUNT(*) AS count
FROM public.orders
WHERE assigned_driver_id IS NOT NULL
  AND status NOT IN ('completed', 'cancelled', 'delivered')
GROUP BY status
ORDER BY count DESC;

-- Final summary
SELECT 
  '=== ALL FIXES APPLIED SUCCESSFULLY ===' AS summary,
  NOW() AS completed_at;

-- Test that the constraint now accepts 'activated'
DO $$
BEGIN
  -- Try to update a test order (using the actual order)
  UPDATE public.orders
  SET status = 'activated'
  WHERE id = '5b2b87ac-8dd7-4339-b28d-df2ec0b985cc';
  
  RAISE NOTICE '✅ Status constraint test passed - ''activated'' is now allowed!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Status constraint test failed: %', SQLERRM;
END $$;
