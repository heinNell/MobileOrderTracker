-- 🔍 CHECK RLS POLICIES ON DRIVER_LOCATIONS TABLE
-- Run this to see what's blocking the mobile app

-- 1. Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'driver_locations' AND schemaname = 'public';

-- 2. List all RLS policies on driver_locations
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
WHERE tablename = 'driver_locations' AND schemaname = 'public';

-- 3. Check table owner and permissions
SELECT
    t.schemaname,
    t.tablename,
    t.tableowner,
    t.rowsecurity,
    t.forcerowsecurity
FROM pg_tables t
WHERE t.tablename = 'driver_locations' AND t.schemaname = 'public';

-- 4. Check what user/role the mobile app is using
SELECT current_user, current_role, session_user;

-- 5. Check if driver_locations table exists and its structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'driver_locations' AND table_schema = 'public'
ORDER BY ordinal_position;