-- 🚀 CLEAN RLS FIX: Working SQL for driver_locations table
-- Based on table structure analysis and requirements

-- First, drop all existing policies to start clean
DROP POLICY IF EXISTS "driver_locations_policy" ON driver_locations;
DROP POLICY IF EXISTS "driver_locations_insert_policy" ON driver_locations;
DROP POLICY IF EXISTS "driver_locations_select_policy" ON driver_locations;
DROP POLICY IF EXISTS "driver_locations_update_policy" ON driver_locations;
DROP POLICY IF EXISTS "driver_locations_delete_policy" ON driver_locations;
DROP POLICY IF EXISTS "Users can insert their own location data" ON driver_locations;
DROP POLICY IF EXISTS "Users can view location data for their tenant" ON driver_locations;
DROP POLICY IF EXISTS "allow_authenticated_select" ON driver_locations;
DROP POLICY IF EXISTS "allow_authenticated_insert" ON driver_locations;
DROP POLICY IF EXISTS "allow_authenticated_update" ON driver_locations;

-- Create permissive policies for authenticated users
CREATE POLICY "driver_locations_select_policy" ON driver_locations
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "driver_locations_insert_policy" ON driver_locations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- User must exist in users table and be authenticated
        auth.uid() IS NOT NULL
        AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
    );

CREATE POLICY "driver_locations_update_policy" ON driver_locations
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
    );

-- Ensure RLS is enabled
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON driver_locations TO authenticated;
GRANT ALL ON driver_locations TO service_role;

-- Show current policies
SELECT 
    'RLS Policies Applied' as status,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'driver_locations' AND schemaname = 'public'
ORDER BY cmd, policyname;

-- Test the table structure compatibility
SELECT 
    'Table Structure Check' as info,
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_name IN ('location', 'latitude', 'longitude') THEN '🗺️ LOCATION FIELD'
        WHEN column_name = 'driver_id' THEN '👤 DRIVER REFERENCE'
        WHEN column_name IN ('speed_kmh', 'accuracy_meters') THEN '📊 TRACKING DATA'
        ELSE '📝 OTHER'
    END as field_type
FROM information_schema.columns
WHERE table_name = 'driver_locations' AND table_schema = 'public'
ORDER BY 
    CASE 
        WHEN column_name = 'id' THEN 1
        WHEN column_name = 'driver_id' THEN 2
        WHEN column_name = 'location' THEN 3
        WHEN column_name = 'latitude' THEN 4
        WHEN column_name = 'longitude' THEN 5
        ELSE 10
    END;