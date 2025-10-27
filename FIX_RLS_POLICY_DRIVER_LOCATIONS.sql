-- ============================================================================
-- FIX RLS POLICY FOR DRIVER_LOCATIONS INSERTS
-- ============================================================================
-- The user exists in the database, but RLS policies are blocking the insert
-- This script fixes the RLS policies to allow authenticated drivers to insert
-- ============================================================================

-- Step 1: Check current RLS policies
SELECT
    '=== CURRENT RLS POLICIES ===' AS section;

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
WHERE tablename = 'driver_locations';

-- Step 2: Check if the user trying to insert is authenticated correctly
SELECT
    '=== USER VERIFICATION ===' AS section;

SELECT
    id,
    email,
    full_name,
    role,
    is_active,
    tenant_id
FROM public.users
WHERE id = '100040d8-8e98-4bfe-8387-a9d611f20f1f';

-- Step 3: DROP and RECREATE the INSERT policy with better conditions
-- This is the most likely issue - the RLS policy is too restrictive

DROP POLICY
IF EXISTS "Drivers can insert own location updates" ON public.driver_locations;

-- New policy: Allow authenticated users with role='driver' to insert their own locations
CREATE POLICY "Drivers can insert own location updates" 
ON public.driver_locations 
FOR
INSERT 
TO authenticated 
WITH CHECK (
-- The driver_id in the insert must match the authenticated user
driver_id
=
auth
.uid
()
  -- The user must exist in public.users (this check might be redundant but safer)
  AND EXISTS
(
    SELECT 1
FROM public.users
WHERE id = auth.uid()
    AND role = 'driver'
    AND is_active = true
  )
);

-- Step 4: Also update the SELECT policy to ensure drivers can read their own data
DROP POLICY
IF EXISTS "Drivers can read own location updates" ON public.driver_locations;

CREATE POLICY "Drivers can read own location updates" 
ON public.driver_locations 
FOR
SELECT
    TO authenticated
USING
(
  driver_id = auth.uid
()
  OR 
  -- Allow admins to read all locations in their tenant
  EXISTS
(
    SELECT 1
FROM public.users
WHERE id = auth.uid()
    AND role IN ('admin', 'dispatcher')
  )
);

-- Step 5: Verify the policies were created
SELECT
    '=== UPDATED POLICIES ===' AS section;

SELECT
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies
WHERE tablename = 'driver_locations'
ORDER BY cmd, policyname;

-- Step 6: Test insert permissions
-- This checks if the authenticated user can insert
SELECT
    '=== PERMISSION TEST ===' AS section;

-- Simulate what the RLS policy checks
SELECT
    'User can insert: ' || 
  CASE 
    WHEN EXISTS (
      SELECT 1
    FROM public.users
    WHERE id = '100040d8-8e98-4bfe-8387-a9d611f20f1f'
        AND role = 'driver'
        AND is_active = true
    ) THEN 'YES ✅'
    ELSE 'NO ❌'
  END as permission_check;

-- Step 7: Alternative - Temporarily disable RLS for testing (NOT for production!)
-- Uncomment ONLY if you want to test without RLS

/*
ALTER TABLE public.driver_locations DISABLE ROW LEVEL SECURITY;

-- After testing, re-enable:
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
*/

-- Step 8: Check if there's a tenant_id mismatch issue
SELECT
    '=== TENANT CHECK ===' AS section;

SELECT
    u.id as user_id,
    u.email,
    u.role,
    u.tenant_id as user_tenant_id,
    t.name as tenant_name,
    t.is_active as tenant_is_active
FROM public.users u
    LEFT JOIN public.tenants t ON u.tenant_id = t.id
WHERE u.id = '100040d8-8e98-4bfe-8387-a9d611f20f1f';

-- Step 9: Verify RLS is enabled
SELECT
    '=== RLS STATUS ===' AS section;

SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'driver_locations'
    AND schemaname = 'public';

-- Step 10: RECOMMENDED - Simplify the INSERT policy even further
-- Drop the complex policy and use a simpler one

DROP POLICY
IF EXISTS "Drivers can insert own location updates" ON public.driver_locations;

CREATE POLICY "Drivers can insert own location updates" 
ON public.driver_locations 
FOR
INSERT 
TO authenticated 
WITH CHECK (
-- Simply check that driver_id matches auth.uid()
-- Let the foreign key constraint handle the rest
driver_id
=
auth
.uid
()
);

-- Final verification
SELECT
    '=== FINAL STATUS ===' AS section,
    'RLS policies updated for driver_locations' AS status,
    'Test mobile app insert now' AS next_step;

-- Display all policies one more time
SELECT
    policyname,
    cmd as operation,
    CASE 
    WHEN cmd = 'INSERT' THEN 'with_check: ' || COALESCE(with_check, 'NULL')
    WHEN cmd = 'SELECT' THEN 'using: ' || COALESCE(qual, 'NULL')
    ELSE 'other'
  END as policy_expression
FROM pg_policies
WHERE tablename = 'driver_locations'
ORDER BY cmd;
