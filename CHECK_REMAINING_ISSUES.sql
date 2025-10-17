';

-- ================================================================
-- 3. Check drivers that exist in drivers table but NOT in users table
-- ================================================================
SELECT
    '❌ DRIVERS WITHOUT USERS ENTRY' as section,
    d.id,
    d.full_name,
    d.phone,
    d.tenant_id as driver_tenant_id,
    d.is_active,
    d.created_at,
    'Missing users table entry - need to create!' as issue
FROM public.drivers d
    LEFT JOIN public.users u ON d.id = u.id
WHERE d.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
    AND u.id IS NULL
ORDER BY d.created_at;

-- ================================================================
-- 4. Complete status of all drivers
-- ================================================================
SELECT
    '📋 COMPLETE DRIVER STATUS' as section,
    d.full_name,
    d.phone,
    d.id,
    d.tenant_id as driver_tenant_id,
    u.tenant_id as user_tenant_id,
    u.role as user_role,
    u.email,
    CASE 
        WHEN u.id IS NULL THEN '❌ NO users entry'
        WHEN u.tenant_id IS NULL THEN '❌ NULL tenant_id'
        WHEN u.tenant_id != d.tenant_id THEN '❌ MISMATCHED tenant_id'
        WHEN u.role != 'driver' THEN '❌ Wrong role: ' || COALESCE(u.role, 'NULL')
        WHEN u.email IS NULL THEN '⚠️ Missing email'
        ELSE '✅ OK'
    END as status
FROM public.drivers d
    LEFT JOIN public.users u ON d.id = u.id
WHERE d.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
ORDER BY 
    CASE 
        WHEN u.id IS NULL THEN 1
        WHEN u.tenant_id IS NULL THEN 2
        WHEN u.tenant_id != d.tenant_id THEN 3
        WHEN u.role != 'driver' THEN 4
        WHEN u.email IS NULL THEN 5
        ELSE 6
    END,
    d.full_name;

-- ================================================================
-- 5. Summary counts
-- ================================================================
SELECT
    '📈 SUMMARY COUNTS' as section,
    (SELECT COUNT(*)
    FROM public.drivers
    WHERE tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43') as total_drivers_in_drivers_table,
    (SELECT COUNT(*)
    FROM public.users
    WHERE role = 'driver' AND tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43') as visible_drivers_in_users_table,
    (SELECT COUNT(*)
    FROM broken_driver_accounts) as broken_drivers,
    (SELECT COUNT(*)
    FROM public.drivers d LEFT JOIN public.users u ON d.id = u.id
    WHERE d.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43' AND u.id IS NULL) as drivers_without_users_entry;

-- ================================================================
-- 6. Check if there are drivers with different tenant_id
-- ================================================================
SELECT
    '🔍 DRIVERS WITH DIFFERENT TENANT_ID' as section,
    tenant_id,
    COUNT(*) as count,
    array_agg(full_name) as driver_names
FROM public.drivers
GROUP BY tenant_id
ORDER BY COUNT(*) DESC;

-- ================================================================
-- 7. Check auth.users for these driver IDs
-- ================================================================
SELECT
    '🔐 AUTH.USERS CHECK' as section,
    au.id,
    au.email,
    au.raw_user_meta_data,
    au.raw_app_meta_data,
    au.created_at,
    CASE 
        WHEN d.id IS NOT NULL THEN '✅ Has driver record'
        ELSE '❌ No driver record'
    END as driver_status,
    CASE 
        WHEN u.id IS NOT NULL THEN '✅ Has users record'
        ELSE '❌ No users record'
    END as users_status
FROM auth.users au
    LEFT JOIN public.drivers d ON d.id = au.id
    LEFT JOIN public.users u ON u.id = au.id
WHERE au.id IN (
    SELECT id
FROM public.drivers
WHERE tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
)
ORDER BY au.created_at;
