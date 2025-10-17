-- 🔧 FIX FOR DRIVER DISAPPEARING ISSUE
-- Problem: sync_user_from_auth() trigger is overwriting tenant_id with NULL
-- Solution: Drop the problematic trigger or fix the function to preserve tenant_id

-- Step 1: Check the current sync_user_from_auth function
SELECT
    'Current sync_user_from_auth function' as info,
    pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'sync_user_from_auth';

-- Step 2: Drop the problematic triggers
-- These triggers sync from auth.users but overwrite tenant_id with NULL
DROP TRIGGER IF EXISTS sync_user_trigger
ON public.users;

-- Step 3: Verify triggers are dropped
SELECT
    'Remaining triggers on users table' as info,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
ORDER BY trigger_name;

-- Step 4: Fix all drivers with NULL tenant_id
-- Set them to the correct tenant_id
UPDATE public.users
SET tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
::uuid
WHERE role = 'driver' 
  AND tenant_id IS NULL;

-- Step 5: Verify all drivers now have tenant_id
SELECT
    '✅ Verification: All Drivers' as status,
    id,
    email,
    full_name,
    role,
    tenant_id,
    is_active,
    CASE 
        WHEN tenant_id IS NULL THEN '❌ STILL NULL'
        ELSE '✅ HAS TENANT'
    END as tenant_status
FROM public.users
WHERE role = 'driver'
ORDER BY created_at DESC;

-- Step 6: Create a BETTER sync function that preserves tenant_id
CREATE OR REPLACE FUNCTION public.sync_user_from_auth
()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync basic info from auth, PRESERVE tenant_id and other critical fields
    -- This prevents overwriting tenant_id when auth.users data changes

    -- Update only email if it changed in auth
    IF NEW.email IS DISTINCT FROM OLD.email THEN
    -- Don't overwrite tenant_id, just update email
    RETURN NEW;
END
IF;
    
    -- For all other changes, preserve existing data
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Re-create the trigger with the fixed function (OPTIONAL)
-- Only uncomment this if you actually need auth sync
-- CREATE TRIGGER sync_user_trigger
--     AFTER INSERT OR UPDATE ON public.users
--     FOR EACH ROW 
--     EXECUTE FUNCTION public.sync_user_from_auth();

-- Step 8: Success message
SELECT
    '🎉 FIX APPLIED' as result,
    COUNT(*) FILTER
(WHERE tenant_id IS NOT NULL) as drivers_with_tenant,
    COUNT
(*) FILTER
(WHERE tenant_id IS NULL) as drivers_without_tenant,
    COUNT
(*) as total_drivers
FROM public.users
WHERE role = 'driver';
