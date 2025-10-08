-- IMMEDIATE FIX for infinite recursion in RLS policies
-- Run this SQL in Supabase SQL Editor NOW

-- Step 1: Drop ALL existing policies that might cause recursion
DROP POLICY
IF EXISTS "users_select_own" ON users;
DROP POLICY
IF EXISTS "users_update_own" ON users;
DROP POLICY
IF EXISTS "users_select_tenant_admin" ON users;
DROP POLICY
IF EXISTS "users_insert_admin" ON users;

-- Step 2: Create SIMPLE, non-recursive policies
-- Policy 1: Users can view their own profile (no subquery on users table)
CREATE POLICY "users_select_own_simple" ON users
    FOR
SELECT
    USING (auth.uid() = id);

-- Policy 2: Users can update their own profile (no subquery on users table)
CREATE POLICY "users_update_own_simple" ON users
    FOR
UPDATE 
    USING (auth.uid()
= id);

-- Policy 3: Service role can do everything (for Edge Functions)
CREATE POLICY "users_service_role_access" ON users
    FOR ALL
    USING
(auth.role
() = 'service_role')
    WITH CHECK
(auth.role
() = 'service_role');

-- Step 3: Create INSERT policy that doesn't reference users table
CREATE POLICY "users_insert_simple" ON users
    FOR
INSERT 
    WITH CHECK (
        -- Allow service role (Edge Functions) to insert users
        auth.role() = 'service_role'
        OR
-- Allow authenticated users to insert (we'll handle tenant checking in app logic)
auth.uid()
IS NOT NULL
    );

-- Step 4: Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 5: Verify policies are working
SELECT 'New simplified policies:' as info;
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;