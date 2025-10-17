-- 🔧 FINAL FIX: Force Update Driver Tenant IDs
-- This WILL work - simpler, more direct approach

-- ============================================================================
-- STEP 1: Verify the problem still exists
-- ============================================================================

SELECT
    'BEFORE FIX - Drivers with NULL tenant' as status,
    id,
    email,
    full_name,
    role,
    tenant_id,
    is_active
FROM public.users
WHERE id IN (
  '6231ff64-25dc-4fd1-9c7c-4606f700010d',  -- Enock Mukonyerwa
  '720ea10c-5328-4821-a8f3-f710a0d176f8'   -- Nikkie
)
ORDER BY full_name;

-- Expected: Both should show tenant_id = NULL

-- ============================================================================
-- STEP 2: UPDATE - Simple, direct, no conditions
-- ============================================================================

-- Update Enock Mukonyerwa - FORCE IT
UPDATE public.users
SET 
  tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
::uuid,
  updated_at = CURRENT_TIMESTAMP
WHERE id = '6231ff64-25dc-4fd1-9c7c-4606f700010d'::uuid;

-- Update Nikkie - FORCE IT
UPDATE public.users
SET 
  tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
::uuid,
  updated_at = CURRENT_TIMESTAMP
WHERE id = '720ea10c-5328-4821-a8f3-f710a0d176f8'::uuid;

-- ============================================================================
-- STEP 3: Verify the fix worked
-- ============================================================================

SELECT
    'AFTER FIX - Check if drivers now have tenant' as status,
    id,
    email,
    full_name,
    role,
    tenant_id,
    is_active,
    updated_at
FROM public.users
WHERE id IN (
  '6231ff64-25dc-4fd1-9c7c-4606f700010d',  -- Enock Mukonyerwa
  '720ea10c-5328-4821-a8f3-f710a0d176f8'   -- Nikkie
)
ORDER BY full_name;

-- Expected: Both should now show tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'

-- ============================================================================
-- STEP 4: Verify orders now match
-- ============================================================================

SELECT
    'Order Tenant Match Check' as status,
    o.order_number,
    o.tenant_id as order_tenant,
    u.full_name as driver_name,
    u.tenant_id as driver_tenant,
    CASE 
    WHEN o.tenant_id = u.tenant_id THEN '✅ MATCH - FIXED!'
    WHEN o.tenant_id IS NULL THEN '❌ Order has NULL tenant'
    WHEN u.tenant_id IS NULL THEN '❌ Driver STILL has NULL tenant'
    ELSE '❌ Still mismatched'
  END as match_status
FROM orders o
    JOIN users u ON o.assigned_driver_id = u.id
WHERE o.order_number IN ('ORD-1760599769131', 'ORD-1759507343591');

-- Expected: Both should show '✅ MATCH - FIXED!'

-- ============================================================================
-- STEP 5: Final summary check
-- ============================================================================

SELECT
    'Final Summary' as check_type,
    (SELECT COUNT(*)
    FROM users
    WHERE role = 'driver') as total_drivers,
    (SELECT COUNT(*)
    FROM users
    WHERE role = 'driver' AND tenant_id IS NOT NULL) as drivers_with_tenant,
    (SELECT COUNT(*)
    FROM users
    WHERE role = 'driver' AND tenant_id IS NULL) as drivers_without_tenant,
    (SELECT COUNT(*)
    FROM orders o
        JOIN users u ON o.assigned_driver_id = u.id
    WHERE o.tenant_id != u.tenant_id OR o.tenant_id IS NULL OR u.tenant_id IS NULL
  ) as orders_with_mismatch;

-- Expected:
-- total_drivers: 6
-- drivers_with_tenant: 6
-- drivers_without_tenant: 0
-- orders_with_mismatch: 0

-- ============================================================================
-- ALTERNATIVE: If the above doesn't work, check for RLS blocking updates
-- ============================================================================

-- If updates still don't work, temporarily disable RLS and try again:
-- (Only run if the updates above fail)

/*
-- Disable RLS temporarily
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Try updates again
UPDATE public.users
SET tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'::uuid, updated_at = CURRENT_TIMESTAMP
WHERE id = '6231ff64-25dc-4fd1-9c7c-4606f700010d'::uuid;

UPDATE public.users
SET tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'::uuid, updated_at = CURRENT_TIMESTAMP
WHERE id = '720ea10c-5328-4821-a8f3-f710a0d176f8'::uuid;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Verify
SELECT * FROM public.users WHERE id IN (
  '6231ff64-25dc-4fd1-9c7c-4606f700010d',
  '720ea10c-5328-4821-a8f3-f710a0d176f8'
);
*/

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- Key differences from previous attempt:
-- 1. Using ::uuid type casting explicitly
-- 2. Using CURRENT_TIMESTAMP instead of NOW()
-- 3. Removed the AND conditions that might prevent update
-- 4. Added RLS workaround if needed
-- 
-- If this STILL doesn't work, there might be:
-- - Database triggers preventing updates
-- - RLS policies blocking updates
-- - These IDs don't actually exist
-- - Connection permissions issue
-- ============================================================================
