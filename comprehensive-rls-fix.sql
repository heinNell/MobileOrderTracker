-- 🛠️ COMPREHENSIVE RLS FIX
-- Fix RLS policies on driver_locations AND map_locations tables

-- First, fix driver_locations table
DROP POLICY IF EXISTS "driver_locations_policy" ON driver_locations;
DROP POLICY IF EXISTS "driver_locations_insert_policy" ON driver_locations;
DROP POLICY IF EXISTS "driver_locations_select_policy" ON driver_locations;
DROP POLICY IF EXISTS "driver_locations_update_policy" ON driver_locations;
DROP POLICY IF EXISTS "driver_locations_delete_policy" ON driver_locations;

-- Create permissive policies for driver_locations
CREATE POLICY "driver_locations_select_policy" ON driver_locations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "driver_locations_insert_policy" ON driver_locations
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "driver_locations_update_policy" ON driver_locations
    FOR UPDATE TO authenticated 
    USING (true) WITH CHECK (auth.uid() IS NOT NULL);

-- Enable RLS on driver_locations
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
GRANT ALL ON driver_locations TO authenticated;

-- Now fix map_locations table (if it exists)
DO $$
BEGIN
    -- Check if map_locations table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'map_locations' AND table_schema = 'public') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "map_locations_policy" ON map_locations;
        DROP POLICY IF EXISTS "map_locations_insert_policy" ON map_locations;
        DROP POLICY IF EXISTS "map_locations_select_policy" ON map_locations;
        DROP POLICY IF EXISTS "map_locations_update_policy" ON map_locations;
        DROP POLICY IF EXISTS "map_locations_delete_policy" ON map_locations;
        
        -- Create permissive policies for map_locations
        CREATE POLICY "map_locations_select_policy" ON map_locations
            FOR SELECT TO authenticated USING (true);
            
        CREATE POLICY "map_locations_insert_policy" ON map_locations
            FOR INSERT TO authenticated 
            WITH CHECK (auth.uid() IS NOT NULL);
            
        CREATE POLICY "map_locations_update_policy" ON map_locations
            FOR UPDATE TO authenticated 
            USING (true) WITH CHECK (auth.uid() IS NOT NULL);
            
        -- Enable RLS and grant permissions
        ALTER TABLE map_locations ENABLE ROW LEVEL SECURITY;
        GRANT ALL ON map_locations TO authenticated;
        
        RAISE NOTICE 'Fixed RLS policies on map_locations table';
    ELSE
        RAISE NOTICE 'map_locations table does not exist, skipping';
    END IF;
END $$;

-- Test the fix
SELECT 'Testing driver_locations access' as test;

-- Try a simple select to verify RLS policies work
SELECT COUNT(*) as current_location_count FROM driver_locations;

-- Show applied policies
SELECT 
    'Applied Policies' as info,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename IN ('driver_locations', 'map_locations') 
    AND schemaname = 'public'
ORDER BY tablename, cmd;