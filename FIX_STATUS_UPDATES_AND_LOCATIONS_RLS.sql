-- ============================================================================
-- FIX STATUS UPDATES AND DRIVER LOCATIONS RLS POLICIES
-- ============================================================================
-- This script fixes RLS policies for both status_updates and driver_locations
-- to ensure proper access from dashboard and mobile apps
-- Run this in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: FIX STATUS_UPDATES TABLE FOREIGN KEY
-- ============================================================================

-- Check current foreign keys on status_updates
DO $$
BEGIN
  RAISE NOTICE '=== Checking status_updates foreign keys ===';
END $$;

SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  a.attname AS column_name,
  confrelid::regclass AS foreign_table,
  af.attname AS foreign_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.conrelid = 'status_updates'::regclass
AND c.contype = 'f';

-- Ensure the driver_id foreign key exists and is properly named
DO $$
DECLARE
  existing_fk_name TEXT;
  fk_exists BOOLEAN;
BEGIN
  -- Check if the correctly named foreign key exists
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'status_updates_driver_id_fkey' 
    AND conrelid = 'status_updates'::regclass
  ) INTO fk_exists;
  
  IF NOT fk_exists THEN
    -- Find any existing foreign key on driver_id column
    SELECT conname INTO existing_fk_name
    FROM pg_constraint
    WHERE conrelid = 'status_updates'::regclass
    AND contype = 'f'
    AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'status_updates'::regclass AND attname = 'driver_id')]
    LIMIT 1;
    
    -- Drop the existing foreign key if it has a different name
    IF existing_fk_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE status_updates DROP CONSTRAINT %I;', existing_fk_name);
      RAISE NOTICE 'Dropped existing foreign key: %', existing_fk_name;
    END IF;
    
    -- Add the properly named foreign key
    ALTER TABLE status_updates 
    ADD CONSTRAINT status_updates_driver_id_fkey 
    FOREIGN KEY (driver_id) REFERENCES users(id);
    
    RAISE NOTICE '✅ Created status_updates_driver_id_fkey constraint';
  ELSE
    RAISE NOTICE '✅ status_updates_driver_id_fkey already exists';
  END IF;
END $$;

-- ============================================================================
-- PART 2: FIX STATUS_UPDATES RLS POLICIES
-- ============================================================================

-- Drop existing policies (all possible variations)
DROP POLICY IF EXISTS "Users can view status updates for their orders" ON status_updates;
DROP POLICY IF EXISTS "Drivers can insert status updates" ON status_updates;
DROP POLICY IF EXISTS "Drivers can view their status updates" ON status_updates;
DROP POLICY IF EXISTS "Admins can view all status updates" ON status_updates;
DROP POLICY IF EXISTS "Admins can insert status updates" ON status_updates;
DROP POLICY IF EXISTS "Dashboard can view all status updates" ON status_updates;
DROP POLICY IF EXISTS "Service role can manage status updates" ON status_updates;
DROP POLICY IF EXISTS "Service role full access to status updates" ON status_updates;

-- Enable RLS
ALTER TABLE status_updates ENABLE ROW LEVEL SECURITY;

-- Policy 1: Drivers can insert their own status updates
CREATE POLICY "Drivers can insert status updates"
ON status_updates FOR INSERT
TO authenticated
WITH CHECK (
  driver_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = status_updates.order_id 
    AND orders.assigned_driver_id = auth.uid()
  )
);

-- Policy 2: Drivers can view status updates for their orders
CREATE POLICY "Drivers can view their status updates"
ON status_updates FOR SELECT
TO authenticated
USING (
  driver_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = status_updates.order_id 
    AND orders.assigned_driver_id = auth.uid()
  )
);

-- Policy 3: Admins/dispatchers can view all status updates
CREATE POLICY "Admins can view all status updates"
ON status_updates FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'dispatcher', 'super_admin')
  )
);

-- Policy 4: Admins can insert status updates (for manual corrections)
CREATE POLICY "Admins can insert status updates"
ON status_updates FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'dispatcher', 'super_admin')
  )
);

-- Policy 5: Service role has full access
CREATE POLICY "Service role full access to status updates"
ON status_updates FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- PART 3: FIX DRIVER_LOCATIONS RLS POLICIES
-- ============================================================================

-- Drop existing policies (all possible variations)
DROP POLICY IF EXISTS "Drivers can insert their locations" ON driver_locations;
DROP POLICY IF EXISTS "Drivers can view their locations" ON driver_locations;
DROP POLICY IF EXISTS "Admins can view all locations" ON driver_locations;
DROP POLICY IF EXISTS "Admins can manage locations" ON driver_locations;
DROP POLICY IF EXISTS "Dashboard can view all locations" ON driver_locations;
DROP POLICY IF EXISTS "Service role can manage locations" ON driver_locations;
DROP POLICY IF EXISTS "Service role full access to locations" ON driver_locations;
DROP POLICY IF EXISTS "Public can view locations for specific orders" ON driver_locations;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON driver_locations;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON driver_locations;
DROP POLICY IF EXISTS "Drivers can insert their own location updates" ON driver_locations;
DROP POLICY IF EXISTS "Drivers can view their own location history" ON driver_locations;
DROP POLICY IF EXISTS "Dispatchers and admins can view all driver locations" ON driver_locations;

-- Enable RLS
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

-- Policy 1: Drivers can insert their own location updates
CREATE POLICY "Drivers can insert their locations"
ON driver_locations FOR INSERT
TO authenticated
WITH CHECK (driver_id = auth.uid());

-- Policy 2: Drivers can view their own location history
CREATE POLICY "Drivers can view their locations"
ON driver_locations FOR SELECT
TO authenticated
USING (driver_id = auth.uid());

-- Policy 3: Admins/dispatchers can view all driver locations
CREATE POLICY "Admins can view all locations"
ON driver_locations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'dispatcher', 'super_admin')
  )
);

-- Policy 4: Admins can insert/update locations (for manual corrections)
CREATE POLICY "Admins can manage locations"
ON driver_locations FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'dispatcher', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'dispatcher', 'super_admin')
  )
);

-- Policy 5: Service role has full access
CREATE POLICY "Service role full access to locations"
ON driver_locations FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 6: Allow public access to specific order tracking (for public tracking page)
CREATE POLICY "Public can view locations for specific orders"
ON driver_locations FOR SELECT
TO anon, authenticated
USING (
  order_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = driver_locations.order_id
  )
);

-- ============================================================================
-- PART 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for status_updates
CREATE INDEX IF NOT EXISTS idx_status_updates_order_id ON status_updates(order_id);
CREATE INDEX IF NOT EXISTS idx_status_updates_driver_id ON status_updates(driver_id);
CREATE INDEX IF NOT EXISTS idx_status_updates_created_at ON status_updates(created_at DESC);

-- Indexes for driver_locations
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_order_id ON driver_locations(order_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_timestamp ON driver_locations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_driver_locations_order_timestamp ON driver_locations(order_id, timestamp DESC);

-- ============================================================================
-- PART 5: VERIFICATION QUERIES
-- ============================================================================

-- Verify status_updates policies
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'status_updates';
  
  RAISE NOTICE '=== STATUS UPDATES POLICIES ===';
  RAISE NOTICE 'Total policies: %', policy_count;
  
  IF policy_count >= 5 THEN
    RAISE NOTICE '✅ Status updates policies configured correctly';
  ELSE
    RAISE WARNING '⚠️  Expected at least 5 policies, found %', policy_count;
  END IF;
END $$;

-- List all status_updates policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_check
FROM pg_policies
WHERE tablename = 'status_updates'
ORDER BY policyname;

-- Verify driver_locations policies
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'driver_locations';
  
  RAISE NOTICE '=== DRIVER LOCATIONS POLICIES ===';
  RAISE NOTICE 'Total policies: %', policy_count;
  
  IF policy_count >= 5 THEN
    RAISE NOTICE '✅ Driver locations policies configured correctly';
  ELSE
    RAISE WARNING '⚠️  Expected at least 5 policies, found %', policy_count;
  END IF;
END $$;

-- List all driver_locations policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_check
FROM pg_policies
WHERE tablename = 'driver_locations'
ORDER BY policyname;

-- Check for data in tables
SELECT 
  'status_updates' as table_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT order_id) as unique_orders,
  COUNT(DISTINCT driver_id) as unique_drivers,
  MAX(created_at) as latest_update
FROM status_updates

UNION ALL

SELECT 
  'driver_locations' as table_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT order_id) as unique_orders,
  COUNT(DISTINCT driver_id) as unique_drivers,
  MAX(timestamp) as latest_update
FROM driver_locations;

COMMIT;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RLS POLICIES UPDATED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes applied:';
  RAISE NOTICE '1. ✅ Fixed status_updates foreign key (driver_id)';
  RAISE NOTICE '2. ✅ Updated status_updates RLS policies';
  RAISE NOTICE '3. ✅ Updated driver_locations RLS policies';
  RAISE NOTICE '4. ✅ Created performance indexes';
  RAISE NOTICE '5. ✅ Added public access for order tracking';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Refresh your dashboard page';
  RAISE NOTICE '2. Check that status updates appear correctly';
  RAISE NOTICE '3. Verify driver locations show on tracking page';
  RAISE NOTICE '4. Test mobile app location tracking';
  RAISE NOTICE '';
END $$;
