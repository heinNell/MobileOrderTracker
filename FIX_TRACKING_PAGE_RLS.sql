-- ================================================================
-- FIX: Dashboard Tracking Page Can't See Driver Locations
-- ================================================================
-- Issue: RLS policies only allow drivers to see their OWN locations
--        Dashboard needs to see ALL drivers' locations
-- ================================================================

BEGIN;

    -- Step 1: Check current RLS policies
    SELECT
        'Current SELECT policies:' as info,
        policyname,
        qual
    FROM pg_policies
    WHERE tablename = 'driver_locations'
        AND cmd = 'SELECT';

    -- Step 2: Drop overly restrictive policies (if they exist)
    DROP POLICY
    IF EXISTS "Drivers can read own location" ON driver_locations;
DROP POLICY
IF EXISTS "drivers_can_view_own_locations" ON driver_locations;
DROP POLICY
IF EXISTS "Enable read access for own locations" ON driver_locations;

-- Step 3: Create proper SELECT policies (with existence checks)

-- Policy 1: Drivers can see their own locations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'driver_locations' 
    AND policyname = 'drivers_select_own_locations'
  ) THEN
    CREATE POLICY "drivers_select_own_locations"
    ON driver_locations
    FOR SELECT
    TO authenticated
    USING (auth.uid() = driver_id);
    
    RAISE NOTICE 'Created policy: drivers_select_own_locations';
  ELSE
    RAISE NOTICE 'Policy already exists: drivers_select_own_locations';
  END IF;
END $$;

-- Policy 2: Dashboard users (admin/dispatcher/manager) can see ALL locations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'driver_locations' 
    AND policyname = 'dashboard_select_all_locations'
  ) THEN
    CREATE POLICY "dashboard_select_all_locations"
    ON driver_locations
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'dispatcher', 'manager', 'owner')
      )
    );
    
    RAISE NOTICE 'Created policy: dashboard_select_all_locations';
  ELSE
    RAISE NOTICE 'Policy already exists: dashboard_select_all_locations';
  END IF;
END $$;

-- Policy 3: Service role can see everything (for server-side queries)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'driver_locations' 
    AND policyname = 'service_role_select_all'
  ) THEN
    CREATE POLICY "service_role_select_all"
    ON driver_locations
    FOR SELECT
    TO service_role
    USING (true);
    
    RAISE NOTICE 'Created policy: service_role_select_all';
  ELSE
    RAISE NOTICE 'Policy already exists: service_role_select_all';
  END IF;
END $$;

-- Step 4: Verify policies are created
SELECT
    'New SELECT policies:' as info,
    policyname,
    roles,
    qual
FROM pg_policies
WHERE tablename = 'driver_locations'
    AND cmd = 'SELECT'
ORDER BY policyname;

-- Step 5: Test query (should return locations now)
SELECT
    'Test query:' as info,
    COUNT(*) as total_locations,
    COUNT(DISTINCT driver_id) as unique_drivers
FROM driver_locations
WHERE created_at >= NOW() - INTERVAL
'24 hours';

-- Step 6: Test with joins (same as dashboard query)
SELECT
    'Test with joins:' as info,
    dl.id,
    u.full_name as driver_name,
    o.order_number,
    dl.latitude,
    dl.longitude
FROM driver_locations dl
    LEFT JOIN users u ON u.id = dl.driver_id
    LEFT JOIN orders o ON o.id = dl.order_id
WHERE dl.created_at >= NOW() - INTERVAL
'24 hours'
LIMIT 5;

COMMIT;

-- ================================================================
-- ALTERNATIVE FIX: If you want to allow EVERYONE to read locations
-- ================================================================
-- Uncomment this if you want public access (for public tracking pages)
-- 
-- DROP POLICY IF EXISTS "public_read_driver_locations" ON driver_locations;
-- 
-- CREATE POLICY "public_read_driver_locations"
-- ON driver_locations
-- FOR SELECT
-- TO public
-- USING (true);
-- ================================================================

-- ================================================================
-- ROLLBACK if needed:
-- ================================================================
-- If something goes wrong, run:
-- 
-- BEGIN;
-- DROP POLICY IF EXISTS "drivers_select_own_locations" ON driver_locations;
-- DROP POLICY IF EXISTS "dashboard_select_all_locations" ON driver_locations;
-- DROP POLICY IF EXISTS "service_role_select_all" ON driver_locations;
-- COMMIT;
-- ================================================================
