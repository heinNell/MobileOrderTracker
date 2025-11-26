-- TEST REALTIME SUBSCRIPTIONS
-- This script inserts fresh test data to verify subscriptions work

-- Step 1: Check current state
SELECT 
  (SELECT COUNT(*) FROM users WHERE role = 'driver') as total_drivers,
  (SELECT COUNT(*) FROM orders WHERE status IN ('in_transit', 'picked_up', 'pending')) as active_orders,
  (SELECT COUNT(*) FROM driver_locations WHERE created_at > NOW() - INTERVAL '1 hour') as recent_locations;

-- Step 2: Create a test driver if none exist
INSERT INTO users (email, role, tenant_id, created_at)
SELECT 
  'test.driver@example.com',
  'driver',
  (SELECT id FROM tenants LIMIT 1),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE role = 'driver'
)
RETURNING id, email, role;

-- Step 3: Create a test order if none exist
INSERT INTO orders (
  order_number,
  status,
  tenant_id,
  loading_point_latitude,
  loading_point_longitude,
  unloading_point_latitude,
  unloading_point_longitude,
  created_at
)
SELECT 
  'TEST-' || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 4, '0'),
  'in_transit',
  (SELECT id FROM tenants LIMIT 1),
  -25.7479, -- Pretoria (loading)
  28.2293,
  -26.2041, -- Johannesburg (unloading)
  28.0473,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM orders WHERE status IN ('in_transit', 'picked_up')
)
RETURNING id, order_number, status;

-- Step 4: Insert a fresh test location (THIS IS THE KEY TEST)
INSERT INTO driver_locations (
  driver_id,
  order_id,
  latitude,
  longitude,
  accuracy,
  speed,
  heading,
  timestamp,
  created_at,
  location_source
)
SELECT 
  (SELECT id FROM users WHERE role = 'driver' LIMIT 1),
  (SELECT id FROM orders WHERE status IN ('in_transit', 'picked_up', 'pending') LIMIT 1),
  -25.7479 + (random() * 0.01 - 0.005), -- Slight random offset
  28.2293 + (random() * 0.01 - 0.005),
  10.0,
  15.5, -- Moving at 15.5 km/h
  90.0, -- Heading East
  NOW(),
  NOW(),
  'test_realtime'
RETURNING 
  id,
  driver_id,
  order_id,
  latitude,
  longitude,
  created_at;

-- Step 5: Verify the test location was inserted
SELECT 
  dl.id,
  dl.latitude,
  dl.longitude,
  dl.speed,
  dl.heading,
  dl.created_at,
  dl.location_source,
  u.email as driver_email,
  o.order_number,
  o.status as order_status,
  EXTRACT(EPOCH FROM (NOW() - dl.created_at)) as seconds_ago
FROM driver_locations dl
LEFT JOIN users u ON u.id = dl.driver_id
LEFT JOIN orders o ON o.id = dl.order_id
WHERE dl.created_at > NOW() - INTERVAL '5 minutes'
ORDER BY dl.created_at DESC
LIMIT 5;

-- Step 6: Check what the tracking page query would return
SELECT 
  dl.id,
  dl.driver_id,
  dl.order_id,
  dl.latitude,
  dl.longitude,
  dl.accuracy,
  dl.speed,
  dl.heading,
  dl.timestamp,
  dl.created_at,
  dl.location_source,
  EXTRACT(EPOCH FROM (NOW() - dl.created_at)) / 3600 as hours_ago
FROM driver_locations dl
WHERE dl.created_at >= NOW() - INTERVAL '24 hours'
  AND dl.latitude IS NOT NULL
  AND dl.longitude IS NOT NULL
ORDER BY dl.created_at DESC
LIMIT 10;

-- Expected results:
-- If you see records in Step 5 and Step 6:
--   ✅ Data is being inserted correctly
--   ✅ RLS policies allow you to SELECT
--   ✅ If you STILL see CHANNEL_ERROR, it's a realtime config issue
--
-- If you see "New driver location received" in browser console immediately:
--   ✅ Real-time subscriptions are working perfectly!
--   ✅ The previous CHANNEL_ERROR was just stale data
--
-- If you DON'T see the new location in browser console:
--   ❌ Real-time subscriptions are not working
--   → Check Supabase Dashboard → Database → Replication
--   → Verify "driver_locations" is in the publication list
