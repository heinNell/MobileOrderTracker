-- =====================================================
-- FIX GEOFENCE SELECTION IN ORDERS AND TEMPLATES
-- =====================================================
-- Issue: Cannot select geofences when creating orders/templates
-- Root Cause: Missing data, inactive geofences, or RLS blocking access
-- Solution: Create test geofences and verify RLS policies
-- =====================================================

-- Step 1: Check if enhanced_geofences table exists and has data
SELECT 
    COUNT(*) as total_geofences,
    COUNT(*) FILTER (WHERE is_active = true) as active_geofences,
    COUNT(DISTINCT tenant_id) as unique_tenants
FROM enhanced_geofences;

-- Step 2: Check RLS policies on enhanced_geofences
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
WHERE tablename = 'enhanced_geofences';

-- Step 3: Verify your user's tenant_id
SELECT 
    id,
    email,
    tenant_id,
    role
FROM users
WHERE id = auth.uid();

-- =====================================================
-- FIX 1: Create Sample Geofences (if table is empty)
-- =====================================================

-- First, get your tenant_id from the query above, then run:
-- Replace 'YOUR_TENANT_ID_HERE' with your actual tenant_id

INSERT INTO enhanced_geofences (
    tenant_id,
    name,
    description,
    geofence_type,
    address,
    city,
    state,
    postal_code,
    country,
    latitude,
    longitude,
    radius_meters,
    polygon_coordinates,
    is_active,
    color,
    icon,
    created_by
) VALUES 
-- Sample Warehouse Geofence
(
    'YOUR_TENANT_ID_HERE',  -- Replace with your tenant_id
    'Main Warehouse',
    'Primary distribution center',
    'warehouse',
    '123 Warehouse St',
    'Portland',
    'OR',
    '97201',
    'USA',
    45.5152,
    -122.6784,
    500,
    NULL,
    true,
    '#3B82F6',
    'warehouse',
    auth.uid()
),
-- Sample Loading Point Geofence
(
    'YOUR_TENANT_ID_HERE',  -- Replace with your tenant_id
    'North Loading Dock',
    'Loading area for outbound shipments',
    'loading_point',
    '456 Loading Dock Rd',
    'Seattle',
    'WA',
    '98101',
    'USA',
    47.6062,
    -122.3321,
    300,
    NULL,
    true,
    '#10B981',
    'truck-loading',
    auth.uid()
),
-- Sample Delivery Zone Geofence
(
    'YOUR_TENANT_ID_HERE',  -- Replace with your tenant_id
    'Downtown Delivery Zone',
    'High-traffic delivery area',
    'delivery_zone',
    'Downtown District',
    'Portland',
    'OR',
    '97204',
    'USA',
    45.5155,
    -122.6789,
    1000,
    NULL,
    true,
    '#F59E0B',
    'map-pin',
    auth.uid()
),
-- Sample Unloading Point Geofence
(
    'YOUR_TENANT_ID_HERE',  -- Replace with your tenant_id
    'Customer Receiving',
    'Customer unloading and receiving area',
    'unloading_point',
    '789 Customer Way',
    'Vancouver',
    'WA',
    '98660',
    'USA',
    45.6387,
    -122.6615,
    200,
    NULL,
    true,
    '#EF4444',
    'flag',
    auth.uid()
);

-- =====================================================
-- FIX 2: Activate All Existing Geofences
-- =====================================================

-- If geofences exist but are inactive, activate them:
UPDATE enhanced_geofences
SET is_active = true
WHERE tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid()
)
AND is_active = false;

-- =====================================================
-- FIX 3: Verify RLS Policies Allow SELECT
-- =====================================================

-- Check if RLS allows users to select geofences
-- If this returns no rows, RLS might be blocking access

SELECT 
    id,
    name,
    geofence_type,
    is_active,
    tenant_id
FROM enhanced_geofences
WHERE tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid()
)
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- FIX 4: Create RLS Policy if Missing
-- =====================================================

-- Only run this if the SELECT above returned no rows
-- and you confirmed geofences exist in Step 1

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view geofences from their tenant" 
ON enhanced_geofences;

-- Create comprehensive SELECT policy
CREATE POLICY "Users can view geofences from their tenant"
ON enhanced_geofences
FOR SELECT
TO authenticated
USING (
    tenant_id = (
        SELECT tenant_id FROM users WHERE id = auth.uid()
    )
);

-- =====================================================
-- FIX 5: Add Missing Indexes for Performance
-- =====================================================

-- Index for tenant_id filtering
CREATE INDEX IF NOT EXISTS idx_enhanced_geofences_tenant_id 
ON enhanced_geofences(tenant_id);

-- Index for active status filtering
CREATE INDEX IF NOT EXISTS idx_enhanced_geofences_is_active 
ON enhanced_geofences(is_active);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_enhanced_geofences_tenant_active 
ON enhanced_geofences(tenant_id, is_active) 
WHERE is_active = true;

-- Index for geofence type filtering
CREATE INDEX IF NOT EXISTS idx_enhanced_geofences_type 
ON enhanced_geofences(geofence_type);

-- =====================================================
-- VERIFICATION: Test Geofence Selection
-- =====================================================

-- Run this to verify geofences are now selectable:

SELECT 
    id,
    name,
    geofence_type,
    address,
    city,
    state,
    is_active,
    created_at
FROM enhanced_geofences
WHERE tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid()
)
AND is_active = true
ORDER BY name;

-- Expected Result: Should see your geofences listed
-- If you see rows, geofence selection should now work!

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================

-- If still no results, check RLS is enabled:
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'enhanced_geofences';
-- Should show: rowsecurity = true

-- Check all policies on the table:
SELECT * FROM pg_policies 
WHERE tablename = 'enhanced_geofences';

-- Verify you're authenticated:
SELECT auth.uid(), auth.role();
-- Should return your user ID and 'authenticated'

-- Check your user has a valid tenant_id:
SELECT 
    u.id,
    u.email,
    u.tenant_id,
    t.name as tenant_name,
    t.is_active as tenant_active
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.id = auth.uid();
-- Should show your user with non-null tenant_id

-- =====================================================
-- QUICK START: Run These in Order
-- =====================================================

-- 1. Get your tenant_id:
SELECT tenant_id FROM users WHERE id = auth.uid();

-- 2. Check existing geofences:
SELECT COUNT(*) FROM enhanced_geofences 
WHERE tenant_id = 'YOUR_TENANT_ID';

-- 3. If count is 0, insert sample geofences above
--    (Remember to replace YOUR_TENANT_ID_HERE)

-- 4. If count > 0 but geofences not showing, activate them:
UPDATE enhanced_geofences SET is_active = true
WHERE tenant_id = 'YOUR_TENANT_ID';

-- 5. Test selection:
SELECT id, name FROM enhanced_geofences 
WHERE tenant_id = 'YOUR_TENANT_ID' AND is_active = true;

-- 6. If still no results, create/fix RLS policy (FIX 4 above)

-- =====================================================
-- SUCCESS CRITERIA
-- =====================================================
-- ✅ SELECT query returns geofences
-- ✅ Geofences appear in dropdown when creating orders
-- ✅ Geofences appear in dropdown when creating templates
-- ✅ Can select multiple geofences
-- ✅ Selected geofences save correctly with order/template
-- =====================================================
