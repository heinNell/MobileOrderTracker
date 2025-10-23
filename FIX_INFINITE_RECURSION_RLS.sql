-- Fix for "infinite recursion detected in policy for relation users"
-- This happens when RLS policies on the users table reference the users table itself

-- ============================================================================
-- STEP 1: CHECK CURRENT POLICIES ON USERS TABLE
-- ============================================================================

SELECT 
  '🔍 Current policies on users table' as info,
  policyname,
  cmd as operation,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users';

-- ============================================================================
-- STEP 2: FIX THE INFINITE RECURSION
-- ============================================================================

-- Disable RLS temporarily to fix the policies
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can view users in their tenant" ON public.users;
DROP POLICY IF EXISTS "Users can insert users in their tenant" ON public.users;
DROP POLICY IF EXISTS "Users can update users in their tenant" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;
DROP POLICY IF EXISTS "Service role full access" ON public.users;
DROP POLICY IF EXISTS "Allow service role full access" ON public.users;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: CREATE NON-RECURSIVE POLICIES
-- ============================================================================

-- Policy 1: Users can view their own record (no recursion - direct ID match)
CREATE POLICY "Users can view own record"
ON public.users
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy 2: Service role has full access (bypasses RLS)
CREATE POLICY "Service role full access"
ON public.users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 3: Users can update their own record (no recursion)
CREATE POLICY "Users can update own record"
ON public.users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================================================
-- STEP 4: CREATE HELPER FUNCTION TO GET USER'S TENANT
-- ============================================================================

-- This function gets the tenant_id without causing recursion
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id 
  FROM public.users 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id() TO authenticated;

-- ============================================================================
-- STEP 5: VERIFY THE FIX
-- ============================================================================

-- Test that we can query users table without recursion
SELECT 
  '✅ User lookup test' as info,
  id,
  email,
  role,
  tenant_id
FROM public.users
WHERE id = auth.uid();

-- Show all policies (should be only 3 now)
SELECT 
  '📋 Fixed policies on users table' as info,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY cmd;

-- ============================================================================
-- STEP 6: FIX OTHER TABLES TO USE THE HELPER FUNCTION
-- ============================================================================

-- Update drivers table policies to use helper function
ALTER TABLE public.drivers DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view drivers in their tenant" ON public.drivers;

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view drivers in their tenant"
ON public.drivers
FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant_id());

-- Update transporters table policies
ALTER TABLE public.transporters DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view transporters in their tenant" ON public.transporters;

ALTER TABLE public.transporters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transporters in their tenant"
ON public.transporters
FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant_id());

-- Update orders table policies
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view orders in their tenant" ON public.orders;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view orders in their tenant"
ON public.orders
FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant_id());

-- Update contacts table policies
ALTER TABLE public.contacts DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view contacts in their tenant" ON public.contacts;

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contacts in their tenant"
ON public.contacts
FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant_id());

-- ============================================================================
-- STEP 7: FINAL VERIFICATION
-- ============================================================================

-- Test user lookup
SELECT 
  '✅ User Lookup Test' as test,
  COUNT(*) as users_found
FROM public.users
WHERE id = auth.uid();

-- Test tenant function
SELECT 
  '✅ Tenant Function Test' as test,
  public.get_user_tenant_id() as my_tenant_id;

-- Test drivers visibility
SELECT 
  '✅ Drivers Visibility Test' as test,
  COUNT(*) as visible_drivers
FROM public.drivers
WHERE tenant_id = public.get_user_tenant_id();

-- Test transporters visibility
SELECT 
  '✅ Transporters Visibility Test' as test,
  COUNT(*) as visible_transporters
FROM public.transporters
WHERE tenant_id = public.get_user_tenant_id();

-- Test orders visibility
SELECT 
  '✅ Orders Visibility Test' as test,
  COUNT(*) as visible_orders
FROM public.orders
WHERE tenant_id = public.get_user_tenant_id();

-- Show summary
SELECT 
  '📊 Summary' as info,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public') as users_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'drivers' AND schemaname = 'public') as drivers_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'transporters' AND schemaname = 'public') as transporters_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'orders' AND schemaname = 'public') as orders_policies;

SELECT '✅ INFINITE RECURSION FIX COMPLETE!' as result;
SELECT '💡 The helper function get_user_tenant_id() now prevents recursion by using SECURITY DEFINER' as note;
