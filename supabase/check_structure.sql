-- Check Database Structure
-- Run this to see what tables and columns actually exist

-- Check if tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'tenants', 'orders', 'location_updates')
ORDER BY table_name;

-- Check columns in users table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY ordinal_position;

-- Check columns in orders table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'orders'
ORDER BY ordinal_position;

-- Check existing RLS policies
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
