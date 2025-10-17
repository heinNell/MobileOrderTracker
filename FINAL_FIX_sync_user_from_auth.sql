-- 🔧 FINAL FIX FOR sync_user_from_auth FUNCTION
-- This fixes the syntax error and prevents tenant_id from being overwritten

-- Step 1: Drop the broken trigger first
DROP TRIGGER IF EXISTS sync_user_trigger ON public.users;

-- Step 2: Create the CORRECT function that preserves tenant_id
CREATE OR REPLACE FUNCTION public.sync_user_from_auth()
RETURNS TRIGGER AS $$
BEGIN
    -- IMPORTANT: This function should ONLY sync data FROM auth.users TO public.users
    -- It should NEVER overwrite application-managed fields like tenant_id
    
    -- For INSERT operations (new user from auth)
    IF TG_OP = 'INSERT' THEN
        -- Let the INSERT happen normally, tenant_id will be set by the application
        RETURN NEW;
    END IF;
    
    -- For UPDATE operations (existing user updated in auth)
    IF TG_OP = 'UPDATE' THEN
        -- Only update email if it changed in auth
        IF NEW.email IS DISTINCT FROM OLD.email THEN
            -- Update email but PRESERVE tenant_id and other fields
            NEW.tenant_id := OLD.tenant_id;
            NEW.role := OLD.role;
            NEW.full_name := OLD.full_name;
            NEW.phone := OLD.phone;
            NEW.is_active := OLD.is_active;
        ELSE
            -- No changes from auth, preserve everything
            NEW.tenant_id := OLD.tenant_id;
            NEW.role := OLD.role;
            NEW.full_name := OLD.full_name;
            NEW.phone := OLD.phone;
            NEW.is_active := OLD.is_active;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Fix all existing NULL tenant_ids
UPDATE public.users
SET tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'::uuid
WHERE role = 'driver' AND tenant_id IS NULL;

-- Step 4: Verify the fix
SELECT
    '✅ Fixed Drivers' as status,
    COUNT(*) FILTER (WHERE tenant_id IS NOT NULL) as drivers_with_tenant,
    COUNT(*) FILTER (WHERE tenant_id IS NULL) as drivers_without_tenant,
    COUNT(*) as total_drivers
FROM public.users
WHERE role = 'driver';

-- Step 5: Show all drivers
SELECT
    'Current Driver Status' as section,
    id,
    email,
    full_name,
    role,
    tenant_id,
    is_active,
    CASE 
        WHEN tenant_id IS NULL THEN '❌ NEEDS FIX'
        ELSE '✅ OK'
    END as status
FROM public.users
WHERE role = 'driver'
ORDER BY created_at DESC;

-- Step 6: OPTIONAL - Re-create trigger ONLY if you need it
-- WARNING: Only uncomment this if you actually need auth->public user sync
-- For most cases, you DON'T need this trigger at all!

/*
CREATE TRIGGER sync_user_trigger
    BEFORE UPDATE ON public.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.sync_user_from_auth();
*/

-- Step 7: Success message
SELECT '🎉 FIX APPLIED - sync_user_from_auth function corrected and trigger removed!' as result;
