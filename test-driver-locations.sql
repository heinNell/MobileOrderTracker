-- Test script for driver_locations table functionality
-- Run this after creating the driver_locations table to verify it works

-- 1. Check if the table exists
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'driver_locations'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if RLS is enabled
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'driver_locations'
    AND schemaname = 'public';

-- 3. List all policies on the table
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
WHERE tablename = 'driver_locations'
    AND schemaname = 'public';

-- 4. Check indexes
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'driver_locations'
    AND schemaname = 'public';

-- 5. Test basic functionality (if you have a test driver)
-- Uncomment and modify the driver_id to test:
/*
-- Insert a test location (replace with actual driver UUID)
INSERT INTO public.driver_locations (
  driver_id, 
  order_id, 
  latitude, 
  longitude, 
  timestamp,
  is_manual_update
) VALUES (
  'your-driver-uuid-here', 
  'your-order-uuid-here', 
  -26.2041, 
  28.0473, 
  NOW(),
  true
);

-- Query recent locations
SELECT 
  dl.id,
  dl.driver_id,
  u.full_name as driver_name,
  dl.order_id,
  dl.latitude,
  dl.longitude,
  dl.timestamp,
  dl.created_at
FROM public.driver_locations dl
JOIN public.users u ON dl.driver_id = u.id
ORDER BY dl.created_at DESC
LIMIT 5;
*/

SELECT 'driver_locations table tests completed' AS result;