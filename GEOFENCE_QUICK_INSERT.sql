-- =====================================================
-- QUICK GEOFENCE INSERT - Copy and Run in Supabase
-- =====================================================
-- Instructions:
-- 1. Get your tenant_id first:
--    SELECT tenant_id FROM users WHERE id = auth.uid();
-- 2. Replace 'YOUR_TENANT_ID_HERE' below with your actual tenant_id
-- 3. Run this entire INSERT statement
-- =====================================================

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
    center_latitude, 
    center_longitude, 
    radius_meters,
    shape_type, 
    facility_type, 
    is_active, 
    created_by
) VALUES
-- Sample 1: Main Warehouse (Loading Point)
(
    'YOUR_TENANT_ID_HERE',
    'Main Warehouse',
    'Primary distribution center',
    'loading_point',
    '123 Warehouse St',
    'Portland',
    'OR',
    '97201',
    'USA',
    45.5152,
    -122.6784,
    500,
    'circle',
    'warehouse',
    true,
    auth.uid()
),
-- Sample 2: North Loading Dock
(
    'YOUR_TENANT_ID_HERE',
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
    'circle',
    'depot',
    true,
    auth.uid()
),
-- Sample 3: Downtown Delivery Zone (Waypoint)
(
    'YOUR_TENANT_ID_HERE',
    'Downtown Delivery Zone',
    'High-traffic delivery area',
    'waypoint',
    'Downtown District',
    'Portland',
    'OR',
    '97204',
    'USA',
    45.5155,
    -122.6789,
    1000,
    'circle',
    'distribution_center',
    true,
    auth.uid()
),
-- Sample 4: Customer Receiving (Unloading Point)
(
    'YOUR_TENANT_ID_HERE',
    'Customer Receiving Area',
    'Customer unloading and receiving',
    'unloading_point',
    '789 Customer Way',
    'Vancouver',
    'WA',
    '98660',
    'USA',
    45.6387,
    -122.6615,
    200,
    'circle',
    'customer_site',
    true,
    auth.uid()
);

-- =====================================================
-- VERIFY: Run this to check if geofences were created
-- =====================================================
SELECT 
    id,
    name,
    geofence_type,
    facility_type,
    city,
    state,
    is_active
FROM enhanced_geofences
WHERE tenant_id = 'YOUR_TENANT_ID_HERE'
ORDER BY created_at DESC;

-- Expected: Should see 4 geofences
-- ✅ Main Warehouse (loading_point)
-- ✅ North Loading Dock (loading_point)
-- ✅ Downtown Delivery Zone (waypoint)
-- ✅ Customer Receiving Area (unloading_point)
