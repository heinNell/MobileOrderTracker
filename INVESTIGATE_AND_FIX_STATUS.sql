-- Investigation and Fix Script for Status Synchronization Issue
-- Order ID: 5b2b87ac-8dd7-4339-b28d-df2ec0b985cc
-- Driver: Roelof Nortjie (roelof@hfr1.gmail.com)

-- ============================================================================
-- PART 0: FIX TRIGGER ERROR (Run this FIRST!)
-- ============================================================================

-- Fix the driver_locations trigger that's causing geometry type errors
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
      RAISE WARNING 'Failed to update geometry location for user %: %', NEW.driver_id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_last_location_trigger
  AFTER INSERT ON public.driver_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_location();

SELECT '✅ Trigger fixed!' AS status;

-- ============================================================================
-- PART 1: INVESTIGATION
-- ============================================================================

-- Check current order state
SELECT 
  id,
  order_number,
  status,
  order_status,
  load_activated_at,
  activated_at,
  tracking_active,
  assigned_driver_id,
  driver_location_lat,
  driver_location_lng,
  last_driver_location,
  created_at,
  updated_at
FROM public.orders
WHERE id = '5b2b87ac-8dd7-4339-b28d-df2ec0b985cc';

-- Check activation history in logs (skip if table doesn't exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'order_status_logs'
  ) THEN
    RAISE NOTICE 'Checking order_status_logs table...';
    PERFORM * FROM public.order_status_logs
    WHERE order_id = '5b2b87ac-8dd7-4339-b28d-df2ec0b985cc'
    ORDER BY created_at DESC;
  ELSE
    RAISE NOTICE '⚠️ order_status_logs table does not exist - skipping history check';
  END IF;
END $$;

-- Check if other orders have same issue
SELECT 
  id,
  order_number,
  status,
  order_status,
  load_activated_at,
  CASE 
    WHEN load_activated_at IS NOT NULL AND status = 'active' THEN '❌ MISMATCH'
    WHEN load_activated_at IS NOT NULL AND status = 'activated' THEN '✅ CORRECT'
    WHEN load_activated_at IS NULL THEN 'Not activated yet'
    ELSE 'Other status: ' || status
  END AS status_check
FROM public.orders
WHERE assigned_driver_id IS NOT NULL
ORDER BY load_activated_at DESC NULLS LAST
LIMIT 20;

-- Check for triggers on orders table
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'orders'
  AND event_object_schema = 'public';

-- Check driver location records
SELECT 
  id,
  driver_id,
  order_id,
  latitude,
  longitude,
  created_at,
  timestamp
FROM public.driver_locations
WHERE order_id = '5b2b87ac-8dd7-4339-b28d-df2ec0b985cc'
ORDER BY created_at DESC
LIMIT 5;

-- Check if user's last_driver_location is being updated
SELECT 
  id,
  full_name,
  email,
  last_location_update,
  last_driver_location,
  ST_AsText(last_driver_location) as location_text
FROM public.users
WHERE id = '1e8658c9-12f1-4e86-be55-b0b1219b7eba';

-- ============================================================================
-- PART 2: FIX THE CURRENT ORDER
-- ============================================================================

-- Fix #1: Update status from 'active' to 'activated'
UPDATE public.orders
SET 
  status = 'activated',
  updated_at = NOW()
WHERE id = '5b2b87ac-8dd7-4339-b28d-df2ec0b985cc'
  AND load_activated_at IS NOT NULL
  AND status = 'active';

-- Verify fix was applied
SELECT 
  'Fix Applied' AS result,
  id,
  order_number,
  status,
  load_activated_at,
  updated_at
FROM public.orders
WHERE id = '5b2b87ac-8dd7-4339-b28d-df2ec0b985cc';

-- Fix #2: Add status log entry for the correction (skip if table doesn't exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'order_status_logs'
  ) THEN
    INSERT INTO public.order_status_logs (
      order_id,
      status,
      notes,
      created_by,
      created_at
    )
    VALUES (
      '5b2b87ac-8dd7-4339-b28d-df2ec0b985cc',
      'activated',
      'Status corrected from ''active'' to ''activated'' - system sync fix',
      '1e8658c9-12f1-4e86-be55-b0b1219b7eba',
      NOW()
    );
    RAISE NOTICE '✅ Status log entry created';
  ELSE
    RAISE NOTICE '⚠️ order_status_logs table does not exist - skipping log entry';
  END IF;
END $$;

-- ============================================================================
-- PART 3: PREVENT FUTURE ISSUES
-- ============================================================================

-- Option A: Fix all orders with the same issue
UPDATE public.orders
SET 
  status = 'activated',
  updated_at = NOW()
WHERE load_activated_at IS NOT NULL
  AND status = 'active'
  AND assigned_driver_id IS NOT NULL;

-- Check how many were fixed
SELECT 
  COUNT(*) AS orders_fixed,
  'Orders updated from ''active'' to ''activated''' AS description
FROM public.orders
WHERE load_activated_at IS NOT NULL
  AND status = 'activated'
  AND updated_at > NOW() - INTERVAL '1 minute';

-- Option B: Create a constraint to prevent 'active' status (if not needed)
-- ONLY RUN THIS if 'active' is not a valid status value
-- ALTER TABLE public.orders
-- ADD CONSTRAINT check_valid_status 
-- CHECK (status IN (
--   'pending', 'assigned', 'activated', 'in_progress', 'in_transit',
--   'arrived', 'arrived_at_loading_point', 'loading', 'loaded',
--   'arrived_at_unloading_point', 'unloading', 'delivered', 'completed', 'cancelled'
-- ));

-- ============================================================================
-- PART 4: VERIFICATION
-- ============================================================================

-- Final verification - check all active orders
SELECT 
  o.id,
  o.order_number,
  o.status,
  o.order_status,
  o.load_activated_at,
  o.tracking_active,
  u.full_name AS driver_name,
  u.email AS driver_email,
  CASE 
    WHEN o.load_activated_at IS NOT NULL AND o.status = 'activated' THEN '✅ Correct'
    WHEN o.load_activated_at IS NOT NULL AND o.status != 'activated' THEN '❌ Needs fix: ' || o.status
    WHEN o.load_activated_at IS NULL AND o.status = 'assigned' THEN '⏳ Not activated yet'
    ELSE '⚠️ Review: ' || COALESCE(o.status, 'NULL')
  END AS validation_status
FROM public.orders o
LEFT JOIN public.users u ON o.assigned_driver_id = u.id
WHERE o.assigned_driver_id IS NOT NULL
  AND o.status NOT IN ('completed', 'cancelled', 'delivered')
ORDER BY o.load_activated_at DESC NULLS LAST;

-- Check mobile app will now see the buttons
SELECT 
  'Mobile App Status Check' AS check_name,
  id,
  order_number,
  status,
  load_activated_at,
  CASE 
    WHEN load_activated_at IS NOT NULL 
      AND status IN ('activated', 'in_progress', 'in_transit', 'arrived', 'loading', 'loaded', 'unloading')
    THEN '✅ StatusUpdateButtons WILL SHOW'
    WHEN load_activated_at IS NOT NULL 
      AND status NOT IN ('activated', 'in_progress', 'in_transit', 'arrived', 'loading', 'loaded', 'unloading')
    THEN '❌ StatusUpdateButtons WILL NOT SHOW - Status is: ' || status
    ELSE '⏳ Not activated - Activate button will show'
  END AS button_visibility
FROM public.orders
WHERE id = '5b2b87ac-8dd7-4339-b28d-df2ec0b985cc';

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================

SELECT 
  '=== STATUS SYNC FIX SUMMARY ===' AS report;

SELECT 
  status,
  COUNT(*) AS order_count,
  SUM(CASE WHEN load_activated_at IS NOT NULL THEN 1 ELSE 0 END) AS activated_count,
  SUM(CASE WHEN load_activated_at IS NULL THEN 1 ELSE 0 END) AS not_activated_count
FROM public.orders
WHERE assigned_driver_id IS NOT NULL
  AND status NOT IN ('completed', 'cancelled', 'delivered')
GROUP BY status
ORDER BY order_count DESC;
