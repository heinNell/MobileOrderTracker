-- 🚀 QUICK FIX: Temporarily disable RLS for testing
-- Use this if you need immediate testing of location updates

-- Option 1: Temporarily disable RLS (for testing only)
-- ALTER TABLE driver_locations DISABLE ROW LEVEL SECURITY;

-- Option 2: Create very permissive policies for authenticated users
DO $
$
BEGIN
    -- Drop all existing policies
    DROP POLICY
    IF EXISTS "driver_locations_policy" ON driver_locations;
    DROP POLICY
    IF EXISTS "driver_locations_insert_policy" ON driver_locations;
    DROP POLICY
    IF EXISTS "driver_locations_select_policy" ON driver_locations;
    DROP POLICY
    IF EXISTS "driver_locations_update_policy" ON driver_locations;
    DROP POLICY
    IF EXISTS "driver_locations_delete_policy" ON driver_locations;
    DROP POLICY
    IF EXISTS "Users can insert their own location data" ON driver_locations;
    DROP POLICY
    IF EXISTS "Users can view location data for their tenant" ON driver_locations;

RAISE NOTICE 'All existing policies removed';
END $$;

-- Create simple, permissive policies for authenticated users
CREATE POLICY "allow_authenticated_select" ON driver_locations
    FOR
SELECT
    TO authenticated
USING
(true);

CREATE POLICY "allow_authenticated_insert" ON driver_locations
    FOR
INSERT
    TO authenticated
    WITH CHECK (
        -- Only check that the user exists in the users table
        EXISTS
    (SELECT 1 
ROM users 
HERE id = auth.uid()

)
    );

CREATE POLICY "allow_authenticated_update" ON driver_locations
    FOR
UPDATE
    TO authenticated
    USING (true)
WITH CHECK
(
        EXISTS
(SELECT 1
FROM users
WHERE id = auth.uid())
);

-- Ensure RLS is enabled
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON driver_locations TO authenticated;
GRANT ALL ON driver_locations TO service_role;

-- Test query
SELECT
    'Simple RLS Policies Applied' as status,
    COUNT(*) as total_policies
FROM pg_policies
WHERE tablename = 'driver_locations' AND schemaname = 'public';

-- Show current policies
SELECT
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'driver_locations' AND schemaname = 'public'
ORDER BY cmd;