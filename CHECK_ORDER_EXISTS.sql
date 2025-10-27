-- ============================================================================
-- CHECK IF ORDER EXISTS
-- ============================================================================
-- This script checks if a specific order exists and shows all active orders
-- ============================================================================

-- Check if specific order exists
SELECT 
  'Checking order: 265de23b-a31a-4dbe-9897-3bfdd1253c76' AS info;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.orders WHERE id = '265de23b-a31a-4dbe-9897-3bfdd1253c76') 
    THEN '✅ Order EXISTS in database'
    ELSE '❌ Order DOES NOT EXIST in database'
  END AS order_status;

-- Show all active orders for the current user
SELECT 
  '--- All Active Orders ---' AS separator;

SELECT 
  id,
  order_number,
  status,
  assigned_driver_id,
  created_at,
  loading_point_name,
  unloading_point_name
FROM public.orders
WHERE status IN ('assigned', 'activated', 'in_progress', 'in_transit', 'loaded', 'unloading', 'loading', 'arrived')
ORDER BY created_at DESC;

-- Check driver_locations with invalid order_ids
SELECT 
  '--- Location Updates with Invalid Order IDs ---' AS separator;

SELECT 
  dl.id,
  dl.driver_id,
  dl.order_id,
  dl.created_at,
  CASE 
    WHEN o.id IS NULL THEN '❌ Order does not exist'
    ELSE '✅ Order exists'
  END AS order_validity
FROM public.driver_locations dl
LEFT JOIN public.orders o ON dl.order_id = o.id
WHERE dl.order_id IS NOT NULL
  AND o.id IS NULL
ORDER BY dl.created_at DESC
LIMIT 20;

-- Show valid driver_locations
SELECT 
  '--- Valid Location Updates (last 10) ---' AS separator;

SELECT 
  dl.id,
  dl.driver_id,
  dl.order_id,
  o.order_number,
  dl.latitude,
  dl.longitude,
  dl.created_at
FROM public.driver_locations dl
LEFT JOIN public.orders o ON dl.order_id = o.id
WHERE dl.order_id IS NOT NULL
  AND o.id IS NOT NULL
ORDER BY dl.created_at DESC
LIMIT 10;
