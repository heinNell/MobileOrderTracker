-- CHECK REALTIME SUBSCRIPTION STATUS
-- Run this to diagnose why subscriptions are failing

-- 1. Check if realtime publication exists
SELECT 
    pubname,
    puballtables,
    pubinsert,
    pubupdate,
    pubdelete
FROM pg_publication
WHERE pubname = 'supabase_realtime';

-- 2. Check which tables are included in realtime publication
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- 3. Check if our tracking tables are included
SELECT 
    t.tablename,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_publication_tables pt 
            WHERE pt.pubname = 'supabase_realtime' 
            AND pt.schemaname = 'public' 
            AND pt.tablename = t.tablename
        ) THEN '✅ ENABLED'
        ELSE '❌ NOT ENABLED'
    END as realtime_status
FROM pg_tables t
WHERE t.schemaname = 'public'
AND t.tablename IN ('driver_locations', 'orders')
ORDER BY t.tablename;

-- 4. Check RLS policies for SELECT (required for realtime)
SELECT 
    tablename,
    policyname,
    CASE 
        WHEN cmd = 'ALL' THEN '✅ ALL (includes SELECT)'
        WHEN cmd = 'SELECT' THEN '✅ SELECT'
        ELSE '⚠️ ' || cmd || ' (no SELECT)'
    END as policy_command,
    roles::text[] as applies_to_roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('driver_locations', 'orders')
ORDER BY tablename, policyname;

-- 5. Check if RLS is enabled
SELECT 
    tablename,
    CASE rowsecurity
        WHEN true THEN '✅ RLS ENABLED'
        ELSE '❌ RLS DISABLED'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('driver_locations', 'orders');

-- 6. Quick data check
SELECT 
    'driver_locations' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as last_hour,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h
FROM driver_locations
UNION ALL
SELECT 
    'orders' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as last_hour,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h
FROM orders;
