-- Debug script to investigate driver tenant_id issues

-- 1. Check current tenant setup
SELECT
    'Current Tenants' as section,
    id,
    name,
    created_at
FROM public.tenants
ORDER BY created_at DESC;

-- 2. Check all admin users and their tenant_ids
SELECT
    'Admin Users' as section,
    id,
    email,
    full_name,
    role,
    tenant_id,
    is_active,
    created_at
FROM public.users
WHERE role = 'admin'
ORDER BY created_at DESC;

-- 3. Check all driver users
SELECT
    'Driver Users' as section,
    id,
    email,
    full_name,
    role,
    tenant_id,
    is_active,
    created_at
FROM public.users
WHERE role = 'driver'
ORDER BY created_at DESC;

-- 4. Check drivers with NULL tenant_id
SELECT
    'Drivers with NULL tenant_id' as issue,
    id,
    email,
    full_name,
    role,
    tenant_id,
    is_active,
    created_at
FROM public.users
WHERE role = 'driver' AND tenant_id IS NULL;

-- 5. Check orders and their assigned drivers
SELECT
    'Orders with Assigned Drivers' as section,
    o.id as order_id,
    o.order_number,
    o.status,
    o.assigned_driver_id,
    o.tenant_id as order_tenant_id,
    u.email as driver_email,
    u.full_name as driver_name,
    u.tenant_id as driver_tenant_id,
    u.is_active as driver_is_active,
    CASE 
        WHEN u.tenant_id IS NULL THEN '⚠️ NULL TENANT'
        WHEN u.tenant_id != o.tenant_id THEN '⚠️ TENANT MISMATCH'
        ELSE '✅ OK'
    END as status_check
FROM public.orders o
    LEFT JOIN public.users u ON o.assigned_driver_id = u.id
WHERE o.assigned_driver_id IS NOT NULL
ORDER BY o.created_at DESC
LIMIT 20;

-- 6. Check RLS policies on users table
SELECT 
    'RLS Policies on users table' as section
,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- 7. Check if there are any triggers on users table that might modify tenant_id
SELECT
    'Triggers on users table' as section,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users'
ORDER BY trigger_name;
