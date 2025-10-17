-- ================================================================
-- DIAGNOSTIC QUERY: Why Drivers Don't Show in Dashboard
-- ================================================================
-- This query checks the relationship between drivers and users tables
-- to identify why drivers exist in the database but don't appear in the dashboard

-- ================================================================
-- 1. Check which drivers have NO corresponding users table entry
-- ================================================================
SELECT 
    'Missing in users table' as issue_type,
    d.id as driver_id,
    d.full_name,
    d.phone,
    d.is_active,
    d.tenant_id as driver_tenant_id,
    'Driver exists in drivers table but NOT in users table' as problem
FROM drivers d
LEFT JOIN users u ON d.id = u.id
WHERE u.id IS NULL
  AND d.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
ORDER BY d.created_at DESC;

-- ================================================================
-- 2. Check drivers with NULL tenant_id in users table (THE SYNC BUG!)
-- ================================================================
SELECT 
    'NULL tenant_id in users' as issue_type,
    d.id as driver_id,
    d.full_name,
    d.phone,
    d.tenant_id as driver_tenant_id,
    u.tenant_id as user_tenant_id,
    u.role as user_role,
    u.email as user_email,
    'Driver exists but users.tenant_id is NULL - SYNC BUG!' as problem
FROM drivers d
INNER JOIN users u ON d.id = u.id
WHERE d.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
  AND u.tenant_id IS NULL
ORDER BY d.created_at DESC;

-- ================================================================
-- 3. Check drivers with MISMATCHED tenant_id
-- ================================================================
SELECT 
    'Mismatched tenant_id' as issue_type,
    d.id as driver_id,
    d.full_name,
    d.phone,
    d.tenant_id as driver_tenant_id,
    u.tenant_id as user_tenant_id,
    u.role as user_role,
    'Driver and user have different tenant_id!' as problem
FROM drivers d
INNER JOIN users u ON d.id = u.id
WHERE d.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
  AND u.tenant_id IS NOT NULL
  AND d.tenant_id != u.tenant_id
ORDER BY d.created_at DESC;

-- ================================================================
-- 4. Check drivers with wrong role in users table
-- ================================================================
SELECT 
    'Wrong role' as issue_type,
    d.id as driver_id,
    d.full_name,
    d.phone,
    u.role as user_role,
    'User exists but role is not "driver"' as problem
FROM drivers d
INNER JOIN users u ON d.id = u.id
WHERE d.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
  AND (u.role IS NULL OR u.role != 'driver')
ORDER BY d.created_at DESC;

-- ================================================================
-- 5. COMPLETE STATUS: All 13 drivers with their users table status
-- ================================================================
SELECT 
    d.id as driver_id,
    d.full_name,
    d.phone,
    d.is_active,
    d.tenant_id as driver_tenant_id,
    CASE 
        WHEN u.id IS NULL THEN '❌ NO users entry'
        WHEN u.tenant_id IS NULL THEN '❌ NULL tenant_id (SYNC BUG!)'
        WHEN u.tenant_id != d.tenant_id THEN '❌ MISMATCHED tenant_id'
        WHEN u.role != 'driver' THEN '❌ Wrong role: ' || COALESCE(u.role, 'NULL')
        ELSE '✅ OK'
    END as status,
    u.tenant_id as user_tenant_id,
    u.role as user_role,
    u.email as user_email,
    u.created_at as user_created_at
FROM drivers d
LEFT JOIN users u ON d.id = u.id
WHERE d.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
ORDER BY 
    CASE 
        WHEN u.id IS NULL THEN 1
        WHEN u.tenant_id IS NULL THEN 2
        WHEN u.tenant_id != d.tenant_id THEN 3
        WHEN u.role != 'driver' THEN 4
        ELSE 5
    END,
    d.created_at DESC;

-- ================================================================
-- 6. Count summary
-- ================================================================
SELECT 
    COUNT(*) as total_drivers,
    COUNT(CASE WHEN u.id IS NULL THEN 1 END) as missing_users_entry,
    COUNT(CASE WHEN u.id IS NOT NULL AND u.tenant_id IS NULL THEN 1 END) as null_tenant_id_bug,
    COUNT(CASE WHEN u.id IS NOT NULL AND u.tenant_id IS NOT NULL AND u.tenant_id != d.tenant_id THEN 1 END) as mismatched_tenant_id,
    COUNT(CASE WHEN u.id IS NOT NULL AND (u.role IS NULL OR u.role != 'driver') THEN 1 END) as wrong_role,
    COUNT(CASE WHEN u.id IS NOT NULL AND u.tenant_id = d.tenant_id AND u.role = 'driver' THEN 1 END) as ok_drivers
FROM drivers d
LEFT JOIN users u ON d.id = u.id
WHERE d.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43';
