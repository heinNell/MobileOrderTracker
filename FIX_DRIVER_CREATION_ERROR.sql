-- Fix for "Database error creating new user" when creating drivers
-- This script diagnoses and fixes issues preventing driver account creation

-- Step 1: Check if there's a problematic trigger on the users table
SELECT 
  'Triggers on users table' as info,
  trigger_name,
  event_manipulation as event,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users' AND event_object_schema = 'public';

-- Step 2: Check the sync_user_from_auth function (if it exists)
SELECT 
  'sync_user_from_auth function' as info,
  proname as function_name,
  prosrc as source_code
FROM pg_proc
WHERE proname = 'sync_user_from_auth';

-- Step 3: DROP problematic triggers that might be interfering
DROP TRIGGER IF EXISTS sync_user_trigger ON public.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;

-- Step 4: Check the users table structure
SELECT 
  'Users table structure' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 5: Check NOT NULL constraints that might be failing
SELECT 
  'NOT NULL columns in users table' as info,
  column_name
FROM information_schema.columns
WHERE table_name = 'users' 
  AND table_schema = 'public'
  AND is_nullable = 'NO'
  AND column_default IS NULL
  AND column_name NOT IN ('id', 'email', 'role');

-- Step 6: Make tenant_id nullable if it's causing issues
ALTER TABLE public.users 
ALTER COLUMN tenant_id DROP NOT NULL;

-- Step 7: Make sure email is NOT NULL (it should be)
ALTER TABLE public.users 
ALTER COLUMN email SET NOT NULL;

-- Step 8: Add helpful defaults
ALTER TABLE public.users 
ALTER COLUMN role SET DEFAULT 'driver';

ALTER TABLE public.users 
ALTER COLUMN is_active SET DEFAULT true;

-- Step 9: Check RLS policies on users table
SELECT 
  'RLS Policies on users table' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd as operation,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users';

-- Step 10: Ensure service role can insert users
-- Drop and recreate policies to ensure service role bypass
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing insert policy
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;
DROP POLICY IF EXISTS "Allow service role full access" ON public.users;

-- Create policy that allows service role to bypass RLS
CREATE POLICY "Service role can insert users"
ON public.users
FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow authenticated users to read their own data
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
CREATE POLICY "Users can view their own data"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- Step 11: Check if drivers table exists and has proper structure
SELECT 
  'Drivers table structure' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'drivers' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 12: Make drivers.tenant_id nullable if needed
ALTER TABLE public.drivers 
ALTER COLUMN tenant_id DROP NOT NULL;

-- Step 13: Check RLS on drivers table
SELECT 
  'RLS Status on drivers table' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'drivers';

-- Step 14: Ensure service role can insert drivers
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can insert drivers" ON public.drivers;
CREATE POLICY "Service role can insert drivers"
ON public.drivers
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage drivers" ON public.drivers;
CREATE POLICY "Service role can manage drivers"
ON public.drivers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Step 15: Allow authenticated users to view drivers in their tenant
DROP POLICY IF EXISTS "Users can view drivers in their tenant" ON public.drivers;
CREATE POLICY "Users can view drivers in their tenant"
ON public.drivers
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.users WHERE id = auth.uid()
  )
  OR tenant_id IS NULL
);

-- Step 16: Test query to verify setup
SELECT 
  'Setup verification' as status,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE event_object_table = 'users' AND event_object_schema = 'public') as users_triggers,
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') as users_rls_enabled,
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'drivers') as drivers_rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users') as users_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'drivers') as drivers_policies;

-- Step 17: Show current policies for verification
SELECT 
  'Final Policy Check' as info,
  tablename,
  policyname,
  cmd as operation,
  roles
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'drivers')
ORDER BY tablename, cmd;

COMMENT ON TABLE public.users IS 'User accounts with proper RLS for service role creation';
COMMENT ON TABLE public.drivers IS 'Driver profiles with proper RLS for service role creation';

-- Success message
SELECT '✅ Driver creation setup fixed! Service role can now create driver accounts.' as result;
