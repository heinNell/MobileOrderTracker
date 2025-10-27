-- ============================================================================
-- Verify and Fix Driver Locations RLS Policies
-- ============================================================================
-- This script checks and fixes RLS policies for the driver_locations table
-- to ensure:
-- 1. Dashboard users can SELECT driver locations
-- 2. Drivers can INSERT and SELECT their own locations
-- 3. Proper foreign key relationships exist
-- ============================================================================

-- Step 1: Check current RLS policies
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
WHERE schemaname = 'public'
    AND tablename = 'driver_locations'
ORDER BY policyname;

-- Step 2: Check foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'driver_locations';

-- Step 3: Check if table has RLS enabled
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename = 'driver_locations';

-- Step 4: Drop existing policies if they exist (to recreate them correctly)
DROP POLICY
IF EXISTS "Drivers can insert their own location updates" ON driver_locations;
DROP POLICY
IF EXISTS "Drivers can view their own location history" ON driver_locations;
DROP POLICY
IF EXISTS "Dispatchers can view all driver locations" ON driver_locations;
DROP POLICY
IF EXISTS "Admin users can view all driver locations" ON driver_locations;

-- Step 5: Create correct RLS policies
-- Enable RLS on the table
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

-- Policy 1: Drivers can insert their own location updates
CREATE POLICY "Drivers can insert their own location updates"
ON driver_locations
FOR
INSERT
TO authenticated
WITH CHECK (
driver_id
=
auth
.uid
()
    AND EXISTS
(
        SELECT 1
FROM users
WHERE users.id = auth.uid()
    AND users.role = 'driver'
    )
);

-- Policy 2: Drivers can view their own location history
CREATE POLICY "Drivers can view their own location history"
ON driver_locations
FOR
SELECT
    TO authenticated
USING
(
    driver_id = auth.uid
()
    AND EXISTS
(
        SELECT 1
FROM users
WHERE users.id = auth.uid()
    AND users.role = 'driver'
    )
);

-- Policy 3: Dispatchers and admins can view all driver locations
CREATE POLICY "Dispatchers and admins can view all driver locations"
ON driver_locations
FOR
SELECT
    TO authenticated
USING
(
    EXISTS
(
        SELECT 1
FROM users
WHERE users.id = auth.uid()
    AND users.role IN ('dispatcher', 'admin')
    )
);

-- Step 6: Verify the policies were created
SELECT
    policyname,
    cmd,
    CASE 
        WHEN cmd = 'SELECT' THEN 'Read access'
        WHEN cmd = 'INSERT' THEN 'Write access'
        WHEN cmd = 'UPDATE' THEN 'Update access'
        WHEN cmd = 'DELETE' THEN 'Delete access'
        ELSE 'Unknown'
    END as access_type,
    CASE 
        WHEN policyname LIKE '%Driver%' THEN 'For drivers'
        WHEN policyname LIKE '%Dispatcher%' OR policyname LIKE '%admin%' THEN 'For dashboard users'
        ELSE 'General'
    END as policy_target
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'driver_locations'
ORDER BY cmd, policyname;

-- Step 7: Test data access (optional - shows what would be visible)
-- Uncomment to test:
-- SELECT COUNT(*) as total_locations FROM driver_locations;
-- SELECT 
--     driver_id,
--     COUNT(*) as location_count,
--     MAX(timestamp) as last_update
-- FROM driver_locations
-- GROUP BY driver_id
-- ORDER BY last_update DESC;

-- Step 8: Check indexes for performance
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'driver_locations'
ORDER BY indexname;

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE '✅ Driver locations RLS policies have been verified and fixed!';
    RAISE NOTICE '📋 Summary:';
    RAISE NOTICE '  - Drivers: Can INSERT and SELECT their own locations';
    RAISE NOTICE '  - Dispatchers/Admins: Can SELECT all driver locations';
    RAISE NOTICE '  - Dashboard should now display driver locations correctly';
END $$;





Results

[
  {
    "indexname": "driver_locations_pkey",
    "indexdef": "CREATE UNIQUE INDEX driver_locations_pkey ON public.driver_locations USING btree (id)"
  },
  {
    "indexname": "idx_driver_locations_active",
    "indexdef": "CREATE INDEX idx_driver_locations_active ON public.driver_locations USING btree (is_active)"
  },
  {
    "indexname": "idx_driver_locations_coords",
    "indexdef": "CREATE INDEX idx_driver_locations_coords ON public.driver_locations USING btree (latitude, longitude)"
  },
  {
    "indexname": "idx_driver_locations_created_at",
    "indexdef": "CREATE INDEX idx_driver_locations_created_at ON public.driver_locations USING btree (created_at)"
  },
  {
    "indexname": "idx_driver_locations_driver",
    "indexdef": "CREATE INDEX idx_driver_locations_driver ON public.driver_locations USING btree (driver_id)"
  },
  {
    "indexname": "idx_driver_locations_driver_id",
    "indexdef": "CREATE INDEX idx_driver_locations_driver_id ON public.driver_locations USING btree (driver_id)"
  },
  {
    "indexname": "idx_driver_locations_driver_id_timestamp",
    "indexdef": "CREATE INDEX idx_driver_locations_driver_id_timestamp ON public.driver_locations USING btree (driver_id, \"timestamp\" DESC)"
  },
  {
    "indexname": "idx_driver_locations_driver_order",
    "indexdef": "CREATE INDEX idx_driver_locations_driver_order ON public.driver_locations USING btree (driver_id, order_id)"
  },
  {
    "indexname": "idx_driver_locations_geometry",
    "indexdef": "CREATE INDEX idx_driver_locations_geometry ON public.driver_locations USING gist (geometry)"
  },
  {
    "indexname": "idx_driver_locations_lat_lng",
    "indexdef": "CREATE INDEX idx_driver_locations_lat_lng ON public.driver_locations USING btree ((((location ->> 'lat'::text))::numeric), (((location ->> 'lng'::text))::numeric))"
  },
  {
    "indexname": "idx_driver_locations_order",
    "indexdef": "CREATE INDEX idx_driver_locations_order ON public.driver_locations USING btree (order_id)"
  },
  {
    "indexname": "idx_driver_locations_order_id",
    "indexdef": "CREATE INDEX idx_driver_locations_order_id ON public.driver_locations USING btree (order_id)"
  },
  {
    "indexname": "idx_driver_locations_order_id_created",
    "indexdef": "CREATE INDEX idx_driver_locations_order_id_created ON public.driver_locations USING btree (order_id, created_at DESC)"
  },
  {
    "indexname": "idx_driver_locations_order_id_timestamp",
    "indexdef": "CREATE INDEX idx_driver_locations_order_id_timestamp ON public.driver_locations USING btree (order_id, \"timestamp\" DESC) WHERE (order_id IS NOT NULL)"
  },
  {
    "indexname": "idx_driver_locations_source",
    "indexdef": "CREATE INDEX idx_driver_locations_source ON public.driver_locations USING btree (location_source)"
  },
  {
    "indexname": "idx_driver_locations_timestamp",
    "indexdef": "CREATE INDEX idx_driver_locations_timestamp ON public.driver_locations USING btree (\"timestamp\" DESC)"
  },
  {
    "indexname": "idx_driver_locations_tracking",
    "indexdef": "CREATE INDEX idx_driver_locations_tracking ON public.driver_locations USING btree (driver_id, order_id, created_at DESC)"
  }
]