-- ========================================
-- FIX LOGIN ISSUES - USER CREATION REPAIR
-- ========================================
-- This script fixes users created via Supabase Auth who can't log in
-- Run DIAGNOSE_LOGIN_ISSUE.sql first to understand the problem

-- ========================================
-- PREREQUISITE: Check if you have tenants
-- ========================================
DO $$
DECLARE
    tenant_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tenant_count FROM public.tenants WHERE is_active = true;
    
    IF tenant_count = 0 THEN
        RAISE EXCEPTION 'NO ACTIVE TENANTS FOUND! You must create at least one tenant first. See instructions below.';
    END IF;
    
    RAISE NOTICE '✅ Found % active tenant(s)', tenant_count;
END $$;

-- ========================================
-- STEP 1: Fix the sync trigger to preserve tenant_id
-- ========================================
-- This ensures future users don't have their tenant_id overwritten

CREATE OR REPLACE FUNCTION public.sync_user_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user already exists in public.users
  IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    -- Update existing user, PRESERVE tenant_id
    UPDATE public.users 
    SET 
        email = NEW.email,
        updated_at = NOW()
        -- DO NOT update tenant_id or role - preserve existing values
    WHERE id = NEW.id;
  ELSE
    -- Insert new user with NULL tenant_id and role
    -- Admin must assign tenant manually after creation
    INSERT INTO public.users (id, email, tenant_id, role, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        NULL, -- Will be set manually by admin
        'user', -- Default role
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '⚠️ New user created: % - ADMIN MUST ASSIGN TENANT_ID', NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_user_from_auth();

RAISE NOTICE '✅ Step 1 Complete: Trigger fixed';

-- ========================================
-- STEP 2: Create missing public.users entries
-- ========================================
-- For users created in auth.users without public.users entries

-- Get the first active tenant (you may need to adjust this logic)
DO $$
DECLARE
    default_tenant_id UUID;
    affected_rows INTEGER;
BEGIN
    -- Get the first active tenant
    SELECT id INTO default_tenant_id 
    FROM public.tenants 
    WHERE is_active = true 
    ORDER BY created_at 
    LIMIT 1;
    
    IF default_tenant_id IS NULL THEN
        RAISE EXCEPTION 'No active tenant found! Create a tenant first.';
    END IF;
    
    -- Create public.users entries for auth.users without them
    -- NOTE: This assigns ALL new users to the FIRST tenant
    -- If you have multiple tenants, you must manually reassign users after this
    INSERT INTO public.users (id, email, tenant_id, role, created_at, updated_at)
    SELECT 
        au.id,
        au.email,
        default_tenant_id, -- Assign to first tenant
        'user', -- Default role (change to 'admin' if needed)
        NOW(),
        NOW()
    FROM auth.users au
    LEFT JOIN public.users pu ON pu.id = au.id
    WHERE pu.id IS NULL; -- Only insert missing users
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    IF affected_rows > 0 THEN
        RAISE NOTICE '✅ Step 2 Complete: Created % public.users entries assigned to tenant: %', 
            affected_rows, default_tenant_id;
    ELSE
        RAISE NOTICE '✅ Step 2 Complete: No missing public.users entries found';
    END IF;
END $$;

-- ========================================
-- STEP 3: Fix existing users with NULL tenant_id
-- ========================================
-- For users who exist but have NULL tenant_id

DO $$
DECLARE
    default_tenant_id UUID;
    affected_rows INTEGER;
BEGIN
    -- Get the first active tenant
    SELECT id INTO default_tenant_id 
    FROM public.tenants 
    WHERE is_active = true 
    ORDER BY created_at 
    LIMIT 1;
    
    -- Update users with NULL tenant_id
    UPDATE public.users
    SET 
        tenant_id = default_tenant_id,
        updated_at = NOW()
    WHERE tenant_id IS NULL;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    IF affected_rows > 0 THEN
        RAISE NOTICE '✅ Step 3 Complete: Fixed % users with NULL tenant_id, assigned to tenant: %', 
            affected_rows, default_tenant_id;
    ELSE
        RAISE NOTICE '✅ Step 3 Complete: No users with NULL tenant_id found';
    END IF;
END $$;

-- ========================================
-- STEP 4: Verification
-- ========================================

-- Show all users with their tenant assignments
SELECT 
    '✅ USER STATUS' as status,
    u.email,
    u.role,
    t.name as tenant_name,
    CASE 
        WHEN au.id IS NULL THEN '❌ Missing auth.users entry'
        WHEN u.tenant_id IS NULL THEN '⚠️ Missing tenant assignment'
        ELSE '✅ Complete'
    END as profile_status
FROM public.users u
LEFT JOIN auth.users au ON au.id = u.id
LEFT JOIN public.tenants t ON t.id = u.tenant_id
ORDER BY u.created_at DESC;

-- Count summary
SELECT 
    '📊 SUMMARY' as summary,
    COUNT(*) as total_users,
    COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as users_with_tenant,
    COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as users_without_tenant
FROM public.users;

-- ========================================
-- MANUAL STEPS (IF NEEDED)
-- ========================================

-- If you have MULTIPLE TENANTS and need to assign users to different tenants:
-- Run this query to see your tenants:
-- SELECT id, name FROM public.tenants WHERE is_active = true;

-- Then manually assign users to correct tenants:
-- UPDATE public.users 
-- SET tenant_id = 'TENANT_UUID_HERE'
-- WHERE email = 'user@example.com';

-- If you need to make a user an ADMIN:
-- UPDATE public.users 
-- SET role = 'admin'
-- WHERE email = 'admin@example.com';

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
DECLARE
    broken_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO broken_users
    FROM public.users
    WHERE tenant_id IS NULL;
    
    IF broken_users = 0 THEN
        RAISE NOTICE '🎉 SUCCESS! All users now have tenant assignments and can log in';
    ELSE
        RAISE WARNING '⚠️ ATTENTION: % users still have NULL tenant_id. Run manual assignment above.', broken_users;
    END IF;
END $$;

-- ========================================
-- IF YOU HAVE NO TENANTS AT ALL
-- ========================================
-- Uncomment and modify this to create your first tenant:

/*
INSERT INTO public.tenants (id, name, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'My Company', -- Change this to your company name
    true,
    NOW(),
    NOW()
)
RETURNING id, name;

-- Then re-run this entire script
*/
