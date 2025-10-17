-- 🔍 WHY DIDN'T THE UPDATE WORK? Investigation

-- ============================================================================
-- CHECK 1: Do these driver IDs actually exist?
-- ============================================================================

SELECT 
  'Do these drivers exist?' as check_type,
  id,
  email,
  full_name,
  role,
  tenant_id,
  is_active,
  created_at,
  updated_at
FROM public.users
WHERE id::text IN (
  '6231ff64-25dc-4fd1-9c7c-4606f700010d',
  '720ea10c-5328-4821-a8f3-f710a0d176f8'
);

-- If this returns 0 rows, these IDs don't exist!

-- ============================================================================
-- CHECK 2: Search for drivers by name instead
-- ============================================================================

SELECT 
  'Find drivers by name' as check_type,
  id,
  email,
  full_name,
  role,
  tenant_id,
  is_active
FROM public.users
WHERE role = 'driver'
  AND (
    full_name ILIKE '%Enock%' OR
    full_name ILIKE '%Mukonyerwa%' OR
    full_name ILIKE '%Nikkie%'
  )
ORDER BY full_name;

-- This will show ALL drivers with those names

-- ============================================================================
-- CHECK 3: Show ALL drivers to find the correct IDs
-- ============================================================================

SELECT 
  'ALL DRIVERS' as check_type,
  id::text as driver_id,
  email,
  full_name,
  role,
  COALESCE(tenant_id::text, 'NULL') as tenant_id,
  is_active,
  created_at::date as created_date
FROM public.users
WHERE role = 'driver'
ORDER BY created_at DESC;

-- This shows every driver - look for Enock and Nikkie here

-- ============================================================================
-- CHECK 4: Which drivers are assigned to the problem orders?
-- ============================================================================

SELECT 
  'Drivers assigned to problem orders' as check_type,
  o.order_number,
  o.assigned_driver_id::text as driver_id_in_order,
  u.id::text as driver_id_from_users,
  u.full_name as driver_name,
  u.email as driver_email,
  COALESCE(u.tenant_id::text, 'NULL') as driver_tenant_id,
  o.tenant_id::text as order_tenant_id
FROM orders o
LEFT JOIN users u ON o.assigned_driver_id = u.id
WHERE o.order_number IN ('ORD-1760599769131', 'ORD-1759507343591')
ORDER BY o.order_number;

-- This shows the ACTUAL driver IDs used in the orders

-- ============================================================================
-- CHECK 5: Check RLS policies on users table
-- ============================================================================

SELECT 
  'RLS Policies on users table' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles::text,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;

-- This shows if RLS is preventing updates

-- ============================================================================
-- CHECK 6: Try a test update on one driver
-- ============================================================================

-- Test if we can update ANY field on these drivers
-- (Don't worry, we're just testing - we'll revert)

DO $$
DECLARE
  test_driver_id uuid := '6231ff64-25dc-4fd1-9c7c-4606f700010d';
  rows_affected integer;
BEGIN
  -- Try to update updated_at (harmless test)
  UPDATE public.users
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = test_driver_id;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  RAISE NOTICE 'Test update affected % rows', rows_affected;
  
  IF rows_affected = 0 THEN
    RAISE NOTICE 'UPDATE FAILED - Either ID does not exist or RLS is blocking';
  ELSE
    RAISE NOTICE 'UPDATE SUCCEEDED - We CAN update this driver';
  END IF;
END $$;

-- Check the NOTICE messages in the output

-- ============================================================================
-- SOLUTION: Based on the results above
-- ============================================================================

-- If CHECK 1 returns 0 rows:
--   → These IDs don't exist, need to find correct IDs from CHECK 3 or CHECK 4

-- If CHECK 1 returns rows BUT they ALREADY HAVE tenant_id:
--   → The fix already worked! The mismatch is something else

-- If CHECK 1 shows NULL tenant BUT test update (CHECK 6) shows 0 rows affected:
--   → RLS is blocking updates, need to disable RLS or use service_role

-- If CHECK 1 shows NULL tenant AND test update works:
--   → Our UPDATE should work, try running fix-drivers-tenant-final.sql

-- ============================================================================
