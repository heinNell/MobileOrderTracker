-- Diagnostic script to check database schema state
-- Run this to see what tables/views exist and their columns

-- Check if orders table exists and its columns
SELECT
    'orders_table' as object_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'orders'
ORDER BY ordinal_position;

-- Check if orders_with_drivers view exists and its columns  
SELECT
    'orders_with_drivers_view' as object_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'orders_with_drivers'
ORDER BY ordinal_position;

-- Check if users table exists and has expected columns
SELECT
    'users_table' as object_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name IN ('id', 'full_name', 'email', 'phone', 'role', 'is_active', 'tenant_id')
ORDER BY ordinal_position;

-- Check foreign key constraints on orders table
SELECT
    'foreign_keys' as object_type,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'orders'
    AND tc.table_schema = 'public';

-- Check if orders_with_drivers view exists at all
SELECT
    'view_existence' as check_type,
    CASE WHEN EXISTS (
        SELECT 1
    FROM information_schema.views
    WHERE table_schema = 'public'
        AND table_name = 'orders_with_drivers'
    ) THEN 'EXISTS' ELSE 'MISSING' END as view_status;