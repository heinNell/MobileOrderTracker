-- Diagnostic script to investigate geofence creation issues

-- 1. Check if enhanced_geofences table exists and its structure
SELECT
    'enhanced_geofences table structure' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'enhanced_geofences'
ORDER BY ordinal_position;

-- 2. Check if RLS is enabled on enhanced_geofences
SELECT
    'RLS Status on enhanced_geofences' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'enhanced_geofences';

-- 3. Check all policies on enhanced_geofences
SELECT
    'Policies on enhanced_geofences' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'enhanced_geofences';

-- 4. Check constraints on enhanced_geofences
SELECT
    'Constraints on enhanced_geofences' as info,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'enhanced_geofences';

-- 5. Check if the regular geofences table exists
SELECT
    'geofences table structure' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'geofences'
ORDER BY ordinal_position;

-- 6. Check RLS on regular geofences table
SELECT
    'RLS Status on geofences' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'geofences';

-- 7. Check all policies on geofences
SELECT
    'Policies on geofences' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'geofences';

-- 8. Check if there are any triggers that might be causing issues
SELECT
    'Triggers on enhanced_geofences' as info,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'enhanced_geofences';

SELECT
    'Triggers on geofences' as info,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'geofences';

-- 9. Check for NOT NULL constraints that might be failing
SELECT
    'NOT NULL columns in enhanced_geofences' as info,
    column_name
FROM information_schema.columns
WHERE table_name = 'enhanced_geofences'
    AND is_nullable = 'NO'
    AND column_default IS NULL;

SELECT
    'NOT NULL columns in geofences' as info,
    column_name
FROM information_schema.columns
WHERE table_name = 'geofences'
    AND is_nullable = 'NO'
    AND column_default IS NULL;

-- 10. Test if current user can access users table for tenant_id
SELECT
    'Current user tenant_id lookup test' as info,
    COUNT(*) as user_count,
    MAX(tenant_id::text) as sample_tenant_id
FROM users
WHERE id = auth.uid();
