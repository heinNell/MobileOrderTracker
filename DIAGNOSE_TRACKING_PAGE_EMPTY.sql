-- ================================================================
-- DIAGNOSTIC: Why is Dashboard Tracking Page Empty?
-- ================================================================
-- Run this in Supabase SQL Editor to find the problem
-- ================================================================

-- Step 1: Check if driver_locations has data
SELECT 
  '1. Basic Data Check' as step,
  COUNT(*) as total_locations,
  COUNT(DISTINCT driver_id) as unique_drivers,
  COUNT(DISTINCT order_id) as unique_orders,
  MAX(created_at) as latest_location,
  MIN(created_at) as earliest_location
FROM driver_locations;

-- Step 2: Check recent locations (last 24 hours - same as dashboard query)
SELECT 
  '2. Last 24 Hours Check' as step,
  COUNT(*) as locations_last_24h
FROM driver_locations
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- Step 3: Check if foreign keys exist
SELECT 
  '3. Foreign Key Check' as step,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'driver_locations';

-- Step 4: Test the exact dashboard query (simplified)
SELECT 
  '4. Dashboard Query Test' as step,
  dl.id,
  dl.driver_id,
  dl.order_id,
  dl.latitude,
  dl.longitude,
  dl.created_at,
  u.full_name as driver_name,
  o.order_number
FROM driver_locations dl
LEFT JOIN users u ON u.id = dl.driver_id
LEFT JOIN orders o ON o.id = dl.order_id
WHERE dl.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY dl.created_at DESC
LIMIT 5;

-- Step 5: Check RLS policies on driver_locations
SELECT 
  '5. RLS Policy Check' as step,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'driver_locations';

-- Step 6: Check if RLS is enabled
SELECT 
  '6. RLS Status' as step,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'driver_locations';

-- Step 7: Check current user role
SELECT 
  '7. Current User' as step,
  current_user as username,
  session_user,
  current_role;

-- Step 8: Test SELECT permission as current user
DO $$
DECLARE
  can_select boolean;
  row_count integer;
BEGIN
  BEGIN
    SELECT COUNT(*) INTO row_count FROM driver_locations;
    can_select := true;
    RAISE NOTICE '8. Permission Test: SUCCESS - Can read % rows', row_count;
  EXCEPTION WHEN OTHERS THEN
    can_select := false;
    RAISE NOTICE '8. Permission Test: FAILED - Error: %', SQLERRM;
  END;
END $$;

-- Step 9: Check for missing driver_id or order_id
SELECT 
  '9. Data Quality Check' as step,
  COUNT(*) FILTER (WHERE driver_id IS NULL) as null_driver_ids,
  COUNT(*) FILTER (WHERE order_id IS NULL) as null_order_ids,
  COUNT(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL) as null_coordinates
FROM driver_locations;

-- Step 10: Sample recent location data
SELECT 
  '10. Sample Data' as step,
  id,
  driver_id,
  order_id,
  latitude,
  longitude,
  created_at,
  timestamp
FROM driver_locations
ORDER BY created_at DESC
LIMIT 3;

-- ================================================================
-- EXPECTED RESULTS:
-- ================================================================
-- Step 1: Should show total locations > 0
-- Step 2: Should show locations in last 24h > 0
-- Step 3: Should show 2 foreign keys (driver_id -> users, order_id -> orders)
-- Step 4: Should return rows with driver name and order number
-- Step 5: Should show RLS policies (especially SELECT policy)
-- Step 6: Should show RLS enabled = true
-- Step 7: Shows which user is running the query
-- Step 8: Should say SUCCESS
-- Step 9: Should show 0 null values
-- Step 10: Should show sample location data
-- ================================================================

-- ================================================================
-- COMMON ISSUES & FIXES:
-- ================================================================
-- 
-- ISSUE 1: Step 2 shows 0 locations
-- FIX: Data is older than 24 hours - check timestamp
-- 
-- ISSUE 2: Step 4 shows NULL driver_name or order_number
-- FIX: Foreign keys missing - run CREATE_DRIVER_LOCATIONS_TABLE.sql
-- 
-- ISSUE 3: Step 5 shows no SELECT policy or wrong policy
-- FIX: RLS blocking reads - run FIX_DRIVER_LOCATIONS_RLS.sql
-- 
-- ISSUE 4: Step 8 says FAILED
-- FIX: No SELECT permission - check user role and RLS policies
-- 
-- ISSUE 5: Step 9 shows NULL coordinates
-- FIX: Location data incomplete - check mobile app tracking
-- ================================================================
