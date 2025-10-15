-- Test query to check location updates and order_id associations
-- Run this in Supabase SQL Editor to verify the fix

-- 1. Check recent location updates
SELECT
    'Recent Location Updates' as test_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN order_id IS NOT NULL THEN 1 END) as with_order_id,
    COUNT(CASE WHEN order_id IS NULL THEN 1 END) as without_order_id
FROM public.driver_locations
WHERE created_at > NOW() - INTERVAL
'1 hour';

-- 2. Show latest 5 location updates with details
SELECT
    dl.created_at,
    dl.driver_id,
    dl.order_id,
    dl.latitude,
    dl.longitude,
    dl.is_manual_update,
    dl.speed_kmh,
    dl.accuracy_meters,
    o.order_number,
    o.status as order_status
FROM public.driver_locations dl
    LEFT JOIN public.orders o ON dl.order_id = o.id
ORDER BY dl.created_at DESC
LIMIT 5;

-- 3. Check for orders that should have location updates
SELECT 
  o
.id,
  o.order_number,
  o.status,
  o.assigned_driver_id,
  COUNT
(dl.id) as location_update_count,
  MAX
(dl.created_at) as latest_location_update
FROM public.orders o
LEFT JOIN public.driver_locations dl ON o.id = dl.order_id
WHERE o.status IN
('activated', 'in_progress', 'in_transit')
GROUP BY o.id, o.order_number, o.status, o.assigned_driver_id
ORDER BY o.updated_at DESC;

-- 4. Summary statistics
SELECT
    'Summary Statistics' as info,
    COUNT(*) as total_location_updates,
    COUNT(DISTINCT driver_id) as unique_drivers,
    COUNT(DISTINCT order_id) as unique_orders_tracked,
    MIN(created_at) as oldest_update,
    MAX(created_at) as newest_update
FROM public.driver_locations;