-- Apply this SQL in Supabase SQL Editor to fix the driver creation issue

-- Step 1: Check current state
SELECT 'Current RLS policies on users table:' as info;
SELECT policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- Step 2: Add missing INSERT policy if it doesn't exist
DO $$
BEGIN
    -- Check if the policy already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'users_insert_admin'
    ) THEN
        -- Create the INSERT policy
        EXECUTE 'CREATE POLICY "users_insert_admin" ON users
            FOR INSERT 
            WITH CHECK (
                -- Allow service role (Edge Functions) to insert users
                auth.role() = ''service_role''
                OR
                -- Allow admin users to create users in their tenant
                (
                    auth.uid() IN (
                        SELECT u.id FROM users u 
                        WHERE u.id = auth.uid() 
                        AND u.role = ''admin''
                        AND u.tenant_id = NEW.tenant_id
                    )
                )
            )';
        RAISE NOTICE 'Created users_insert_admin policy';
    ELSE
        RAISE NOTICE 'users_insert_admin policy already exists';
    END IF;
END
$$;

-- Step 3: Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 4: Verify the new state
SELECT 'Updated RLS policies on users table:' as info;
SELECT policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- Step 5: Test query to verify policies work
SELECT 'Testing basic user query:' as info;
SELECT id, email, full_name, role, tenant_id 
FROM users 
WHERE role = 'admin' 
LIMIT 3;