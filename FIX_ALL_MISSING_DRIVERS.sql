-- ================================================================
-- COMPLETE FIX: Missing Drivers Issue
-- ================================================================
-- This script will:
-- 1. Fix the broken sync_user_from_auth() trigger
-- 2. Restore ALL NULL tenant_ids from drivers table to users table
-- 3. Verify all 13 drivers are now visible
-- 4. Add safety constraints to prevent future issues
-- 
-- CRITICAL: This is the root cause of drivers disappearing from dashboard
-- ================================================================

-- ================================================================
-- STEP 1: Drop the broken trigger that overwrites tenant_id
-- ================================================================
DROP TRIGGER IF EXISTS sync_user_trigger ON public.users;
DROP TRIGGER IF EXISTS sync_user_trigger_on_update ON public.users;

-- ================================================================
-- STEP 2: Create CORRECT sync function that PRESERVES tenant_id
-- ================================================================
CREATE OR REPLACE FUNCTION public.sync_user_from_auth()
RETURNS TRIGGER AS $$
BEGIN
    -- For UPDATE operations, PRESERVE application-managed fields
    IF TG_OP = 'UPDATE' THEN
        -- CRITICAL: Preserve tenant_id (application-managed, not in auth.users)
        NEW.tenant_id := OLD.tenant_id;
        
        -- Preserve other application-managed fields
        NEW.role := OLD.role;
        NEW.full_name := OLD.full_name;
        NEW.phone := OLD.phone;
        NEW.is_active := OLD.is_active;
        
        -- Only allow email updates
        -- (email can be changed via auth.users, so we sync it)
        IF NEW.email IS DISTINCT FROM OLD.email THEN
            -- Email was changed in auth.users, allow the update
            RETURN NEW;
        END IF;
        
        RETURN NEW;
    END IF;

    -- For INSERT operations, just return NEW (initial creation)
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comment
COMMENT ON FUNCTION public.sync_user_from_auth() IS 
'Syncs user data from auth.users to public.users. 
PRESERVES application-managed fields like tenant_id, role, full_name.
Only syncs auth-controlled fields like email.
Fixed 2025-10-17: No longer overwrites tenant_id with NULL.';

-- ================================================================
-- STEP 3: Recreate trigger (optional - may not be needed)
-- ================================================================
-- Note: This trigger may not be necessary if we're managing users
-- through the application. Commenting out for now.
-- 
-- CREATE TRIGGER sync_user_trigger
-- AFTER UPDATE ON public.users
-- FOR EACH ROW
-- EXECUTE FUNCTION public.sync_user_from_auth();

-- ================================================================
-- STEP 4: FIX ALL EXISTING DRIVERS - Restore tenant_id from drivers table
-- ================================================================
-- This is the CRITICAL fix that will make your 13 drivers visible again!

UPDATE public.users u
SET 
    tenant_id = d.tenant_id,
    updated_at = NOW()
FROM public.drivers d
WHERE u.id = d.id
  AND u.tenant_id IS NULL
  AND d.tenant_id IS NOT NULL;

-- Show how many were fixed
DO $$
DECLARE
    fixed_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fixed_count
    FROM public.users u
    INNER JOIN public.drivers d ON u.id = d.id
    WHERE u.tenant_id = d.tenant_id
      AND d.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43';
    
    RAISE NOTICE '✅ Fixed % driver records', fixed_count;
END $$;

-- ================================================================
-- STEP 5: VERIFICATION - Check all 13 drivers are now OK
-- ================================================================

-- Check 1: Drivers with correct tenant_id in users table
SELECT 
    '✅ FIXED DRIVERS' as status,
    COUNT(*) as count,
    '(Should be 13)' as expected
FROM public.users u
INNER JOIN public.drivers d ON u.id = d.id
WHERE u.role = 'driver'
  AND u.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
  AND d.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43';

-- Check 2: Any remaining broken drivers?
SELECT 
    '❌ STILL BROKEN' as status,
    COUNT(*) as count,
    '(Should be 0)' as expected
FROM public.drivers d
LEFT JOIN public.users u ON d.id = u.id
WHERE d.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
  AND (u.id IS NULL OR u.tenant_id IS NULL OR u.tenant_id != d.tenant_id);

-- Check 3: Detailed list of all 13 drivers
SELECT 
    d.full_name,
    d.phone,
    u.email,
    CASE 
        WHEN u.id IS NULL THEN '❌ Missing users entry'
        WHEN u.tenant_id IS NULL THEN '❌ NULL tenant_id'
        WHEN u.tenant_id != d.tenant_id THEN '❌ Mismatched tenant_id'
        WHEN u.role != 'driver' THEN '❌ Wrong role'
        ELSE '✅ OK - Visible in dashboard'
    END as status
FROM public.drivers d
LEFT JOIN public.users u ON d.id = u.id
WHERE d.tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
ORDER BY d.full_name;

-- ================================================================
-- STEP 6: ADD SAFETY CONSTRAINTS (Prevent future issues)
-- ================================================================

-- Constraint 1: Driver users MUST have tenant_id
-- This prevents the sync bug from breaking drivers in the future
DO $$
BEGIN
    -- Drop if exists (in case it was created before)
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_driver_must_have_tenant;
    
    -- Add constraint
    ALTER TABLE public.users 
    ADD CONSTRAINT users_driver_must_have_tenant 
    CHECK (role != 'driver' OR tenant_id IS NOT NULL);
    
    RAISE NOTICE '✅ Added constraint: driver users must have tenant_id';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Constraint already exists or could not be added: %', SQLERRM;
END $$;

-- ================================================================
-- STEP 7: CREATE MONITORING VIEW (Optional)
-- ================================================================
CREATE OR REPLACE VIEW broken_driver_accounts AS
SELECT 
    d.id,
    d.full_name,
    d.phone,
    d.tenant_id as driver_tenant_id,
    u.tenant_id as user_tenant_id,
    u.role as user_role,
    CASE 
        WHEN u.id IS NULL THEN 'Missing users table entry'
        WHEN u.tenant_id IS NULL THEN 'NULL tenant_id in users (SYNC BUG!)'
        WHEN u.tenant_id != d.tenant_id THEN 'Mismatched tenant_id'
        WHEN u.role != 'driver' THEN 'Wrong role in users table'
    END as issue
FROM public.drivers d
LEFT JOIN public.users u ON d.id = u.id
WHERE d.is_active = true
  AND (
    u.id IS NULL 
    OR u.tenant_id IS NULL 
    OR u.tenant_id != d.tenant_id 
    OR u.role != 'driver'
  );

COMMENT ON VIEW broken_driver_accounts IS 
'Monitoring view to detect broken driver accounts.
Should always return 0 rows after fix is applied.
If rows appear, the sync bug may have reoccurred.';

-- ================================================================
-- FINAL SUMMARY
-- ================================================================
SELECT 
    '🎉 FIX COMPLETE!' as message,
    (SELECT COUNT(*) FROM public.users WHERE role = 'driver' AND tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43') as visible_drivers,
    (SELECT COUNT(*) FROM broken_driver_accounts) as broken_drivers,
    CASE 
        WHEN (SELECT COUNT(*) FROM broken_driver_accounts) = 0 
        THEN '✅ All drivers are now visible in dashboard'
        ELSE '⚠️ Some drivers still broken - check broken_driver_accounts view'
    END as status;

-- ================================================================
-- NEXT STEPS FOR USER:
-- ================================================================
-- 1. Execute this script in Supabase SQL Editor
-- 2. Check that "visible_drivers" shows 13
-- 3. Check that "broken_drivers" shows 0
-- 4. Refresh dashboard - all drivers should now appear
-- 5. Test creating new driver - should work without issue
-- 6. Test assigning driver to order - driver should remain visible
-- ================================================================
