-- ================================================================
-- FIX REMAINING DRIVER ISSUES
-- ================================================================
-- Current state: 6 visible, 1 broken, 6 missing
-- This script will:
-- 1. Fix the 1 broken driver
-- 2. Create missing users entries for drivers without them
-- 3. Handle drivers that may need auth.users entries
-- ================================================================

-- ================================================================
-- STEP 1: Fix the broken driver (restore tenant_id if NULL)
-- ================================================================
UPDATE public.users u
SET 
    tenant_id = d.tenant_id,
    updated_at = NOW()
FROM public.drivers d
WHERE u.id = d.id
  AND d.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
  AND (u.tenant_id IS NULL OR u.tenant_id != d.tenant_id);

-- ================================================================
-- STEP 2: Fix drivers with wrong role in users table
-- ================================================================
UPDATE public.users u
SET 
    role = 'driver',
    updated_at = NOW()
FROM public.drivers d
WHERE u.id = d.id
  AND d.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
  AND (u.role IS NULL OR u.role != 'driver');

-- ================================================================
-- STEP 3: Create missing users entries for drivers (ONLY for drivers with auth.users)
-- ================================================================
-- This handles drivers that were created via Edge Function but missing users entry
-- NOTE: Cannot create users entry without auth.users entry due to FK constraint

INSERT INTO public.users (
    id,
    email,
    full_name,
    phone,
    role,
    tenant_id,
    is_active,
    created_at,
    updated_at
)
SELECT 
    d.id,
    au.email,  -- Must get from auth.users (FK constraint requires it)
    d.full_name,
    d.phone,
    'driver' as role,
    d.tenant_id,
    d.is_active,
    d.created_at,
    NOW() as updated_at
FROM public.drivers d
INNER JOIN auth.users au ON au.id = d.id  -- MUST exist in auth.users!
WHERE d.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
  AND NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = d.id
  )
ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    role = 'driver',
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Show how many were created/updated
DO $$
DECLARE
    created_count INTEGER;
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO created_count
    FROM public.users u
    INNER JOIN public.drivers d ON u.id = d.id
    WHERE u.role = 'driver'
      AND u.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
      AND d.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43';
    
    -- Count drivers without auth.users entries (cannot be fixed automatically)
    SELECT COUNT(*) INTO orphaned_count
    FROM public.drivers d
    LEFT JOIN auth.users au ON au.id = d.id
    WHERE d.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
      AND au.id IS NULL;
    
    RAISE NOTICE '✅ Total drivers now visible: %', created_count;
    
    IF orphaned_count > 0 THEN
        RAISE NOTICE '⚠️ Drivers without auth.users (cannot fix automatically): %', orphaned_count;
        RAISE NOTICE '   These drivers need to be recreated via dashboard';
    END IF;
END $$;

-- ================================================================
-- STEP 3.5: Identify drivers that cannot be fixed automatically
-- ================================================================
SELECT 
    '⚠️ ORPHANED DRIVERS (NO AUTH ENTRY)' as issue_type,
    d.id,
    d.full_name,
    d.phone,
    'Must recreate via dashboard - no auth.users entry' as action_required
FROM public.drivers d
LEFT JOIN auth.users au ON au.id = d.id
WHERE d.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
  AND au.id IS NULL;

-- ================================================================
-- STEP 4: VERIFICATION
-- ================================================================

-- Check 1: How many drivers are now visible?
SELECT 
    '✅ VISIBLE DRIVERS' as status,
    COUNT(*) as count,
    '(Should be 13)' as expected
FROM public.users u
INNER JOIN public.drivers d ON u.id = d.id
WHERE u.role = 'driver'
  AND u.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
  AND d.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43';

-- Check 2: Any still broken?
SELECT 
    '❌ STILL BROKEN' as status,
    COUNT(*) as count,
    '(Should be 0)' as expected
FROM broken_driver_accounts;

-- Check 3: Detailed list
SELECT 
    d.full_name,
    d.phone,
    u.email,
    CASE 
        WHEN u.id IS NULL THEN '❌ Missing users entry'
        WHEN u.tenant_id IS NULL THEN '❌ NULL tenant_id'
        WHEN u.tenant_id != d.tenant_id THEN '❌ Mismatched tenant_id'
        WHEN u.role != 'driver' THEN '❌ Wrong role'
        ELSE '✅ OK - Visible'
    END as status
FROM public.drivers d
LEFT JOIN public.users u ON d.id = u.id
WHERE d.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
ORDER BY d.full_name;

-- ================================================================
-- FINAL SUMMARY
-- ================================================================
SELECT 
    '🎉 FIX COMPLETE!' as message,
    (SELECT COUNT(*) FROM public.users WHERE role = 'driver' AND tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43') as visible_drivers,
    (SELECT COUNT(*) FROM broken_driver_accounts) as broken_drivers,
    (SELECT COUNT(*) FROM public.drivers WHERE tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43') as total_in_drivers_table,
    CASE 
        WHEN (SELECT COUNT(*) FROM broken_driver_accounts) = 0 
        THEN '✅ All drivers are now visible in dashboard'
        ELSE '⚠️ Some drivers still broken - check broken_driver_accounts view'
    END as status;

-- ================================================================
-- IMPORTANT NOTES:
-- ================================================================
-- If drivers still don't appear after this, they may need auth.users entries
-- Run CHECK_REMAINING_ISSUES.sql to diagnose further
-- 
-- For drivers without auth.users entries (manually inserted), you'll need to:
-- 1. Create auth users via dashboard "Create Driver" function
-- 2. Or create them manually via create-driver-account Edge Function
-- ================================================================
