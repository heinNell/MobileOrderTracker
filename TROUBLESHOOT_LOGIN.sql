-- ========================================
-- LOGIN TROUBLESHOOTING - NEXT STEPS
-- ========================================
-- Your database is PERFECT (all users configured correctly)
-- Let's find out why login still fails

-- ========================================
-- STEP 1: Check Email Confirmation Status
-- ========================================
-- Users MUST confirm their email to log in

SELECT
    email,
    created_at,
    email_confirmed_at,
    confirmed_at,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN '✅ Email Confirmed'
        ELSE '❌ EMAIL NOT CONFIRMED - THIS IS LIKELY THE PROBLEM'
    END as email_status,
    last_sign_in_at,
    CASE 
        WHEN last_sign_in_at IS NOT NULL THEN '✅ Has logged in before'
        ELSE '⚠️ Never logged in'
    END as login_history
FROM auth.users
ORDER BY created_at DESC;

-- ========================================
-- STEP 2: Check User Details and Roles
-- ========================================

SELECT
    u.email,
    u.role,
    t.name as tenant_name,
    au.email_confirmed_at,
    au.last_sign_in_at,
    CASE 
        WHEN au.email_confirmed_at IS NULL THEN '❌ Email not confirmed'
        WHEN u.role IS NULL THEN '⚠️ No role assigned'
        WHEN u.tenant_id IS NULL THEN '❌ No tenant assigned'
        ELSE '✅ Ready to log in'
    END as login_readiness
FROM public.users u
    JOIN auth.users au ON au.id = u.id
    LEFT JOIN public.tenants t ON t.id = u.tenant_id
ORDER BY u.created_at DESC;

-- ========================================
-- STEP 3: Check RLS Policies
-- ========================================
-- Make sure authenticated users can access their data

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('users', 'tenants', 'orders', 'drivers')
ORDER BY tablename, policyname;

-- ========================================
-- STEP 4: Test a Specific User's Access
-- ========================================
-- Replace 'user@example.com' with the email you're trying to log in with

DO $$
DECLARE
    test_email TEXT := 'user@example.com'; -- ⬅️ CHANGE THIS
    user_record RECORD;
BEGIN
    -- Get user details
    SELECT
        u.id,
        u.email,
        u.role,
        u.tenant_id,
        t.name as tenant_name,
        au.email_confirmed_at,
        au.last_sign_in_at
    INTO user_record
    FROM public.users u
        LEFT JOIN auth.users au ON au.id = u.id
        LEFT JOIN public.tenants t ON t.id = u.tenant_id
    WHERE u.email = test_email;

    IF NOT FOUND THEN
        RAISE EXCEPTION '❌ User % not found in public.users!', test_email;
END
IF;
    
    RAISE NOTICE '📧 Email: %', user_record.email;
    RAISE NOTICE '🔑 Role: %', user_record.role;
    RAISE NOTICE '🏢 Tenant: %', user_record.tenant_name;
    RAISE NOTICE '📅 Email Confirmed: %', 
        CASE 
            WHEN user_record.email_confirmed_at IS NOT NULL THEN '✅ YES'
            ELSE '❌ NO - User cannot log in until email is confirmed!'
END;
    RAISE NOTICE '🕐 Last Login: %', 
        COALESCE
(user_record.last_sign_in_at::TEXT, 'Never');

-- Check if user can access their tenant data
IF user_record.tenant_id IS NULL THEN
        RAISE WARNING '❌ User has no tenant_id - RLS will block access';
    ELSE
        RAISE NOTICE '✅ User has tenant_id - RLS should allow access';
END
IF;
END $$;

-- ========================================
-- FIXES FOR COMMON ISSUES
-- ========================================

-- FIX 1: Confirm user email manually (if email not confirmed)
-- Go to Supabase Dashboard → Authentication → Users → Click user → "Confirm Email"
-- Or run this (replace email):
-- UPDATE auth.users 
-- SET email_confirmed_at = NOW(), 
--     confirmed_at = NOW()
-- WHERE email = 'user@example.com';

-- FIX 2: Make user an admin (if they need admin access)
-- UPDATE public.users 
-- SET role = 'admin'
-- WHERE email = 'user@example.com';

-- FIX 3: Reset user password (if password is wrong)
-- Go to Supabase Dashboard → Authentication → Users → Click user → "Reset Password"
-- Or generate a reset link in your app

-- FIX 4: Check if user is disabled
SELECT
    email,
    banned_until,
    CASE 
        WHEN banned_until IS NOT NULL AND banned_until > NOW() THEN '❌ USER IS BANNED'
        ELSE '✅ User not banned'
    END as ban_status
FROM auth.users
WHERE email = 'user@example.com';
-- ⬅️ CHANGE THIS

-- ========================================
-- STEP 5: Check Supabase Connection
-- ========================================

-- Verify your Supabase project URL matches your .env files
-- Expected: https://liagltqpeilbswuqcahp.supabase.co

-- Check anon key is valid (run in your dashboard app):
-- console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
-- console.log('SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20) + '...');

-- ========================================
-- WHAT TO CHECK IN BROWSER
-- ========================================

-- 1. Open browser console (F12)
-- 2. Try to log in
-- 3. Look for errors in Console tab
-- 4. Check Network tab for failed requests
-- 5. Look for these common errors:
--    - "Invalid login credentials" = Wrong email/password
--    - "Email not confirmed" = User needs to confirm email
--    - "Network request failed" = Supabase URL/key incorrect
--    - "User not found" = No auth.users entry (unlikely based on diagnostic)
--    - 403 Forbidden = RLS policy blocking (unlikely based on diagnostic)

-- ========================================
-- VERIFICATION QUERY
-- ========================================

-- Run this to see which users are ready to log in
SELECT
    u.email,
    CASE 
        WHEN au.email_confirmed_at IS NULL THEN '❌ Cannot login - Email not confirmed'
        WHEN u.tenant_id IS NULL THEN '⚠️ Can login but RLS will block - No tenant'
        WHEN u.role IS NULL THEN '⚠️ Can login but limited access - No role'
        ELSE '✅ Can login successfully'
    END as login_status,
    au.last_sign_in_at as last_successful_login
FROM public.users u
    JOIN auth.users au ON au.id = u.id
ORDER BY u.created_at DESC;
