-- 🔍 DEBUG ORDER ACTIVATION ISSUES
-- Run this to check why activation is failing

-- 1. Check if orders table exists and has data
SELECT 'Orders table status' as check_type, COUNT(*) as count
FROM orders;

-- 2. Check orders assigned to drivers
SELECT 'Assigned orders' as check_type, COUNT(*) as count
FROM orders
WHERE assigned_driver_id IS NOT NULL;

-- 3. Check specific order statuses
SELECT
    'Order statuses' as check_type,
    status,
    COUNT(*) as count
FROM orders
GROUP BY status
ORDER BY count DESC;

-- 4. Check RLS policies on orders table
SELECT
    'Orders RLS policies' as check_type,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'orders' AND schemaname = 'public';

-- 5. Check if RLS is enabled on orders
SELECT
    'Orders table RLS status' as check_type,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'orders' AND schemaname = 'public';

-- 6. Check orders table permissions
SELECT
    'Orders table permissions' as check_type,
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'orders' AND table_schema = 'public';

-- 7. Check status_updates table
SELECT 'Status updates table' as check_type, COUNT(*) as count
FROM status_updates;

-- 8. Check recent orders with detailed info
SELECT
    'Recent orders detail' as check_type,
    id,
    order_number,
    status,
    assigned_driver_id,
    load_activated_at,
    created_at
FROM orders
ORDER BY created_at DESC 
LIMIT 5;

-- 9. Check column structure of orders table
SELECT 
    'Orders table structure' as check_type
,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' AND table_schema = 'public'
ORDER BY ordinal_position;