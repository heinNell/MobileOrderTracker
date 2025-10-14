-- 🛠️ FIX RLS POLICIES FOR DRIVER_LOCATIONS TABLE
-- This allows mobile app to insert location updates

-- First, let's see the current state
SELECT 'Current RLS Policies' as info;
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'driver_locations' AND schemaname = 'public';

-- Drop existing policies that might be too restrictive
DO $$
BEGIN
    -- Drop all existing policies on driver_locations
    DROP POLICY IF EXISTS "driver_locations_policy" ON driver_locations;
    DROP POLICY IF EXISTS "driver_locations_insert_policy" ON driver_locations;
    DROP POLICY IF EXISTS "driver_locations_select_policy" ON driver_locations;
    DROP POLICY IF EXISTS "driver_locations_update_policy" ON driver_locations;
    DROP POLICY IF EXISTS "driver_locations_delete_policy" ON driver_locations;
    DROP POLICY IF EXISTS "Users can insert their own location data" ON driver_locations;
    DROP POLICY IF EXISTS "Users can view location data for their tenant" ON driver_locations;
    RAISE NOTICE 'Existing policies dropped';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Some policies may not have existed: %', SQLERRM;
END $$;

-- Create comprehensive RLS policies for driver_locations

-- 1. SELECT: Users can view location data for their tenant
CREATE POLICY "driver_locations_select_policy" ON driver_locations
    FOR SELECT
    USING (
        -- Allow if user is the driver themselves
        auth.uid() = driver_id
        OR
        -- Allow if user is admin/dispatcher in same tenant
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.tenant_id = (
                SELECT u2.tenant_id FROM users u2 WHERE u2.id = driver_id
            )
            AND u.role IN ('admin', 'dispatcher')
        )
        OR
        -- Allow service role (for backend operations)
        auth.role() = 'service_role'
    );

-- 2. INSERT: Drivers can insert their own location data
CREATE POLICY "driver_locations_insert_policy" ON driver_locations
    FOR INSERT
    WITH CHECK (
        -- User must be inserting their own location
        auth.uid() = driver_id
        AND
        -- User must exist in users table with driver role
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'driver'
            AND u.is_active = true
        )
        OR
        -- Allow service role (for backend operations)
        auth.role() = 'service_role'
    );

-- 3. UPDATE: Drivers can update their own location data  
CREATE POLICY "driver_locations_update_policy" ON driver_locations
    FOR UPDATE
    USING (
        auth.uid() = driver_id
        OR
        auth.role() = 'service_role'
    )
    WITH CHECK (
        auth.uid() = driver_id
        OR
        auth.role() = 'service_role'
    );

-- 4. DELETE: Only admins or service role can delete
CREATE POLICY "driver_locations_delete_policy" ON driver_locations
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
        )
        OR
        auth.role() = 'service_role'
    );

-- Ensure RLS is enabled
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT ON driver_locations TO authenticated;
GRANT UPDATE ON driver_locations TO authenticated;

-- Grant all permissions to service role
GRANT ALL ON driver_locations TO service_role;

-- Show the new policies
SELECT 'New RLS Policies Created' as status;
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    SUBSTRING(qual, 1, 100) as condition_preview,
    SUBSTRING(with_check, 1, 100) as with_check_preview
FROM pg_policies 
WHERE tablename = 'driver_locations' AND schemaname = 'public'
ORDER BY cmd, policyname;

-- Test the policies with a sample query
SELECT 'Testing policies...' as test_status;

-- This should show what the current user can see
SELECT COUNT(*) as visible_locations FROM driver_locations;

-- For debugging: Show current auth context
SELECT 
    'Auth Context' as info,
    auth.uid() as current_user_id,
    auth.role() as current_role;