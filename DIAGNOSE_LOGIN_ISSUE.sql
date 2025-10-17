-- ========================================
-- COMPREHENSIVE LOGIN ISSUE DIAGNOSTIC
-- ========================================
-- This script identifies why users can't log in after being created in Supabase Auth

-- Step 1: Check auth.users entries (users created via Supabase Auth UI)
SELECT
    'AUTH USERS' as check_type,
    COUNT(*) as count,
    string_agg(email, ', ') as emails
FROM auth.users;

-- Step 2: Check public.users entries (application users with tenant_id)
SELECT
    'PUBLIC USERS' as check_type,
    COUNT(*) as count,
    string_agg(email, ', ') as emails
FROM public.users;

-- Step 3: Find auth.users WITHOUT corresponding public.users entries
-- These users can authenticate but have no database profile
SELECT
    '❌ AUTH WITHOUT PUBLIC' as issue,
    au.id,
    au.email,
    au.created_at as auth_created,
    'Missing public.users entry - LOGIN WILL FAIL' as problem
FROM auth.users au
    LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC;

-- Step 4: Find public.users with NULL tenant_id
-- These users exist but lack tenant association - RLS will block them
SELECT
    '⚠️ USERS WITHOUT TENANT' as issue,
    u.id,
    u.email,
    u.tenant_id,
    u.role,
    'NULL tenant_id - RLS policies will block access' as problem
FROM public.users u
WHERE u.tenant_id IS NULL;

-- Step 5: Check if sync_user_from_auth trigger exists and is enabled
SELECT
    'TRIGGER STATUS' as check_type,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created'
    AND event_object_table = 'users'
    AND event_object_schema = 'auth';

-- Step 6: Check users table structure (tenant_id should exist)
SELECT
    'USERS TABLE COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'users'
ORDER BY ordinal_position;

-- Step 7: Check RLS policies on users table
SELECT
    'RLS POLICIES' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'users';

-- Step 8: Check if there are any tenants available
SELECT
    'AVAILABLE TENANTS' as check_type,
    id,
    name,
    is_active
FROM public.tenants
ORDER BY created_at;

-- ========================================
-- SUMMARY REPORT
-- ========================================

-- Final diagnosis: Show the gap
WITH
    auth_count
    AS
    (
        SELECT COUNT(*) as auth_users
        FROM auth.users
    ),
    public_count
    AS
    (
        SELECT COUNT(*) as public_users
        FROM public.users
    ),
    missing_count
    AS
    (
        SELECT COUNT(*) as missing
        FROM auth.users au
            LEFT JOIN public.users pu ON pu.id = au.id
        WHERE pu.id IS NULL
    ),
    no_tenant_count
    AS
    (
        SELECT COUNT(*) as no_tenant
        FROM public.users
        WHERE tenant_id IS NULL
    )
SELECT
    '🔍 DIAGNOSIS SUMMARY' as summary,
    ac.auth_users as total_auth_users,
    pc.public_users as total_public_users,
    mc.missing as auth_without_public_profile,
    ntc.no_tenant as users_without_tenant,
    CASE 
        WHEN mc.missing > 0 THEN '❌ CRITICAL: Users missing public.users entries'
        WHEN ntc.no_tenant > 0 THEN '⚠️ WARNING: Users missing tenant_id (RLS will block)'
        ELSE '✅ All users have complete profiles'
    END as diagnosis
FROM auth_count ac, public_count pc, missing_count mc, no_tenant_count ntc;
