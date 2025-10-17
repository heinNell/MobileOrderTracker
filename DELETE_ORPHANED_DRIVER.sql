-- ================================================================
-- DELETE ORPHANED DRIVER (Cannot be fixed automatically)
-- ================================================================
-- Driver ID: b1f554db-145a-40f6-b572-fb7cae1ae32b
-- Name: Heinrich Nel
-- Phone: +27662731270
-- 
-- This driver was manually inserted into the drivers table but has
-- NO corresponding auth.users entry. Due to FK constraint, we cannot
-- create a users entry without an auth entry.
-- 
-- OPTIONS:
-- 1. DELETE this driver and recreate via dashboard (RECOMMENDED)
-- 2. Keep in drivers table but it won't be visible (NOT RECOMMENDED)
-- ================================================================

-- ================================================================
-- OPTION 1: Delete the orphaned driver (RECOMMENDED)
-- ================================================================
-- This will remove the driver that cannot be fixed
-- You can then recreate it properly via the dashboard

DELETE FROM public.drivers 
WHERE id = 'b1f554db-145a-40f6-b572-fb7cae1ae32b'
    AND tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43';

-- Verification
SELECT
    CASE 
        WHEN NOT EXISTS (
            SELECT 1
    FROM public.drivers
    WHERE id = 'b1f554db-145a-40f6-b572-fb7cae1ae32b'
        ) THEN '✅ Orphaned driver deleted successfully'
        ELSE '❌ Driver still exists'
    END as status;

-- ================================================================
-- NOW RECREATE VIA DASHBOARD
-- ================================================================
-- 1. Open dashboard
-- 2. Navigate to Drivers page
-- 3. Click "Create Driver"
-- 4. Fill in details:
--    - Full Name: Heinrich Nel
--    - Email: heinrich.nel.driver@example.com (or any valid email)
--    - Phone: +27662731270
--    - License Number: LICENSE123
--    - License Expiry: (appropriate date)
-- 5. Click "Create"
-- 
-- This will properly create:
-- - auth.users entry (for login)
-- - public.users entry (for dashboard visibility)
-- - public.drivers entry (for driver data)
-- ================================================================

-- ================================================================
-- FINAL VERIFICATION
-- ================================================================
SELECT
    '📊 FINAL DRIVER COUNT' as section,
    COUNT(*) as visible_drivers,
    '(Should be 12 after delete, 13 after recreate)' as expected
FROM public.users u
    INNER JOIN public.drivers d ON u.id = d.id
WHERE u.role = 'driver'
    AND u.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
    AND d.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43';

-- Check for any remaining orphaned drivers
SELECT
    '⚠️ REMAINING ORPHANS' as section,
    COUNT(*) as count,
    '(Should be 0)' as expected
FROM public.drivers d
    LEFT JOIN auth.users au ON au.id = d.id
WHERE d.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
    AND au.id IS NULL;
