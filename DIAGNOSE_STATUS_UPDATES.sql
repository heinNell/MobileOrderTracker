-- ========================================
-- DIAGNOSE STATUS UPDATE ISSUES
-- ========================================
-- Run this in Supabase SQL Editor to diagnose why status updates aren't working

-- 1. Check status_updates table schema
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'status_updates'
ORDER BY ordinal_position;

-- 2. Check RLS policies on status_updates table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'status_updates';

-- 3. Check if RLS is enabled on status_updates
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'status_updates';

-- 4. Check orders table schema for status column
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name IN ('status', 'assigned_driver_id')
ORDER BY ordinal_position;

-- 5. Check RLS policies on orders table
SELECT
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;

-- 6. Sample check: Try to see recent status_updates
SELECT
    id,
    order_id,
    status,
    driver_id,
    user_id,
    notes,
    created_at
FROM status_updates
ORDER BY created_at DESC
LIMIT 5;

-- 7. Check order_status_history table
SELECT 
    column_name
,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'order_status_history'
ORDER BY ordinal_position;

-- 8. Check if there are any recent orders with drivers assigned
SELECT
    id,
    order_number,
    status,
    assigned_driver_id,
    created_at,
    updated_at
FROM orders
WHERE assigned_driver_id IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;

-- 9. Check status enum values in database
SELECT 
    e
.enumlabel as status_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'order_status'
ORDER BY e.enumsortorder;

-- 10. Test if authenticated user can UPDATE orders
-- This will show what the current user can do
SELECT
    current_user as database_user,
    session_user
as session_user;

COMMENT ON TABLE status_updates IS 'Check results above to diagnose status update issues';
