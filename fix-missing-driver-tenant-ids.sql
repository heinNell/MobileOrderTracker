-- 🔧 FIX: Assign Missing Tenant IDs to Drivers
-- This fixes the "drivers disappearing" issue by setting tenant_id for drivers that have NULL

-- ============================================================================
-- CRITICAL FIX: Update drivers with NULL tenant_id
-- ============================================================================

-- These two drivers are missing tenant_id, causing them to disappear from lists
-- Driver "Enock Mukonyerwa" - ID: 6231ff64-25dc-4fd1-9c7c-4606f700010d
-- Driver "Nikkie" (duplicate?) - ID: 720ea10c-5328-4821-a8f3-f710a0d176f8

-- The correct tenant_id based on your orders is: 17ed751d-9c45-4cbb-9ccc-50607c151d43

-- ============================================================================
-- STEP 1: Verify the drivers that need fixing
-- ============================================================================

SELECT
    '=== DRIVERS WITH NULL TENANT (BEFORE FIX) ===' as status,
    id,
    email,
    full_name,
    role,
    COALESCE(tenant_id::text, 'NULL') as tenant_id,
    is_active
FROM public.users
WHERE role = 'driver'
    AND tenant_id IS NULL;

-- Expected: Should show 2 drivers (Enock Mukonyerwa and Nikkie)

-- ============================================================================
-- STEP 2: Update the drivers with correct tenant_id
-- ============================================================================

-- Update driver: Enock Mukonyerwa
UPDATE public.users
SET 
  tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43',
  updated_at = NOW()
WHERE id = '6231ff64-25dc-4fd1-9c7c-4606f700010d'
    AND role = 'driver'
    AND tenant_id IS NULL;

-- Update driver: Nikkie (ID: 720ea10c-5328-4821-a8f3-f710a0d176f8)
UPDATE public.users
SET 
  tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43',
  updated_at = NOW()
WHERE id = '720ea10c-5328-4821-a8f3-f710a0d176f8'
    AND role = 'driver'
    AND tenant_id IS NULL;

-- ============================================================================
-- STEP 3: Verify the fix worked
-- ============================================================================

SELECT
    '=== DRIVERS WITH NULL TENANT (AFTER FIX) ===' as status,
    id,
    email,
    full_name,
    role,
    COALESCE(tenant_id::text, 'NULL') as tenant_id,
    is_active
FROM public.users
WHERE role = 'driver'
    AND tenant_id IS NULL;

-- Expected: Should return NO rows (all drivers now have tenant_id)

-- ============================================================================
-- STEP 4: Verify tenant consistency is now correct
-- ============================================================================

SELECT
    '=== TENANT CONSISTENCY CHECK (AFTER FIX) ===' as status,
    o.order_number,
    o.tenant_id as order_tenant,
    u.full_name as driver_name,
    u.tenant_id as driver_tenant,
    CASE 
    WHEN o.assigned_driver_id IS NULL THEN '⚪ No Driver'
    WHEN o.tenant_id = u.tenant_id THEN '✅ Match'
    WHEN o.tenant_id IS NULL THEN '⚠️ Order No Tenant'
    WHEN u.tenant_id IS NULL THEN '⚠️ Driver No Tenant'
    ELSE '❌ MISMATCH'
  END as tenant_match
FROM orders o
    LEFT JOIN users u ON o.assigned_driver_id = u.id
WHERE o.assigned_driver_id IN (
  '6231ff64-25dc-4fd1-9c7c-4606f700010d',
  '720ea10c-5328-4821-a8f3-f710a0d176f8'
)
ORDER BY o.created_at DESC;

-- Expected: All rows should show '✅ Match'

-- ============================================================================
-- STEP 5: Check all drivers now have tenant_id
-- ============================================================================

SELECT
    '=== ALL DRIVERS STATUS (FINAL CHECK) ===' as status,
    id,
    full_name,
    email,
    COALESCE(tenant_id::text, 'NULL') as tenant_id,
    is_active,
    CASE 
    WHEN tenant_id IS NULL THEN '❌ Missing Tenant'
    ELSE '✅ Has Tenant'
  END as tenant_status
FROM public.users
WHERE role = 'driver'
ORDER BY full_name;

-- Expected: All drivers should show '✅ Has Tenant'

-- ============================================================================
-- STEP 6: Summary
-- ============================================================================

SELECT
    '=== FIX SUMMARY ===' as section,
    '' as metric,
    '' as value;

SELECT
    '' as section,
    'Total Drivers' as metric,
    COUNT(*)
::text as value
FROM public.users
WHERE role = 'driver'
UNION ALL
SELECT
    '' as section,
    'Drivers With Tenant' as metric,
    COUNT(*)
::text as value
FROM public.users
WHERE role = 'driver' AND tenant_id IS NOT NULL
UNION ALL
SELECT
    '' as section,
    'Drivers Without Tenant' as metric,
    COUNT(*)
::text as value
FROM public.users
WHERE role = 'driver' AND tenant_id IS NULL
UNION ALL
SELECT
    '' as section,
    'Orders With Tenant Mismatch' as metric,
    COUNT(*)::text as value
FROM orders o
    JOIN users u ON o.assigned_driver_id = u.id
WHERE o.tenant_id != u.tenant_id OR o.tenant_id IS NULL OR u.tenant_id IS NULL;

-- Expected results after fix:
-- Total Drivers: 8 (or however many you have)
-- Drivers With Tenant: 8 (all drivers)
-- Drivers Without Tenant: 0 (none missing)
-- Orders With Tenant Mismatch: 0 (all matching)

-- ============================================================================
-- PREVENTION: Add constraint to prevent NULL tenant_id in future
-- ============================================================================

-- Optional: Add NOT NULL constraint to prevent this issue in future
-- Only run this AFTER confirming all existing drivers have tenant_id

-- ALTER TABLE public.users 
-- ADD CONSTRAINT users_driver_must_have_tenant 
-- CHECK (role != 'driver' OR tenant_id IS NOT NULL);

-- This constraint ensures all drivers MUST have a tenant_id

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================
-- 
-- 1. Run STEP 1 to see the problematic drivers
-- 2. Run STEP 2 to fix them (assigns correct tenant_id)
-- 3. Run STEP 3 to verify no drivers have NULL tenant_id
-- 4. Run STEP 4 to verify orders now match their drivers
-- 5. Run STEP 5 to see all drivers with proper tenant
-- 6. Run STEP 6 to see summary statistics
-- 
-- After running this fix:
-- - All drivers will have tenant_id
-- - Dashboard will show all drivers consistently
-- - No more "disappearing" drivers
-- - Orders will show correct driver assignments
-- 
-- The dashboard code changes we made earlier will now work perfectly
-- because all drivers have the required tenant_id!
-- ============================================================================
