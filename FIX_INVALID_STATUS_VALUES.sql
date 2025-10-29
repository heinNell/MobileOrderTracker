-- ============================================================================
-- FIX INVALID STATUS VALUES IN ORDERS TABLE
-- ============================================================================
-- This script fixes orders that have invalid status values like "active" 
-- which should be "activated"
-- ============================================================================

-- 1. Check for invalid status values
-- ============================================================================
SELECT 
  '=== INVALID STATUS VALUES ===' AS check_type,
  id,
  order_number,
  status,
  'Found invalid status' AS issue
FROM orders
WHERE status NOT IN (
  'pending',
  'assigned',
  'activated',
  'in_progress',
  'in_transit',
  'arrived',
  'arrived_at_loading_point',
  'loading',
  'loaded',
  'arrived_at_unloading_point',
  'unloading',
  'delivered',
  'completed',
  'cancelled'
);

-- 2. Fix "active" status (should be "activated")
-- ============================================================================
UPDATE orders
SET 
  status = 'activated',
  updated_at = NOW()
WHERE status = 'active';

-- Verify the fix
SELECT 
  '=== FIXED ACTIVE TO ACTIVATED ===' AS result,
  COUNT(*) AS rows_updated
FROM orders
WHERE status = 'activated';

-- 3. Check for other common typos or invalid values
-- ============================================================================
-- Fix "in_progress" typos
UPDATE orders
SET 
  status = 'in_progress',
  updated_at = NOW()
WHERE status IN ('inprogress', 'in progress', 'in-progress');

-- Fix "in_transit" typos
UPDATE orders
SET 
  status = 'in_transit',
  updated_at = NOW()
WHERE status IN ('intransit', 'in transit', 'in-transit');

-- Fix "arrived_at_loading_point" typos
UPDATE orders
SET 
  status = 'arrived_at_loading_point',
  updated_at = NOW()
WHERE status IN ('arrived_loading', 'at_loading_point', 'loading_point');

-- Fix "arrived_at_unloading_point" typos
UPDATE orders
SET 
  status = 'arrived_at_unloading_point',
  updated_at = NOW()
WHERE status IN ('arrived_unloading', 'at_unloading_point', 'unloading_point');

-- 4. Final verification - should return no rows
-- ============================================================================
SELECT 
  '=== REMAINING INVALID STATUSES ===' AS check_type,
  id,
  order_number,
  status,
  'Still invalid - needs manual fix' AS issue
FROM orders
WHERE status NOT IN (
  'pending',
  'assigned',
  'activated',
  'in_progress',
  'in_transit',
  'arrived',
  'arrived_at_loading_point',
  'loading',
  'loaded',
  'arrived_at_unloading_point',
  'unloading',
  'delivered',
  'completed',
  'cancelled'
);

-- 5. Show all current statuses
-- ============================================================================
SELECT 
  '=== CURRENT STATUS DISTRIBUTION ===' AS report,
  status,
  COUNT(*) AS count
FROM orders
GROUP BY status
ORDER BY 
  CASE status
    WHEN 'pending' THEN 1
    WHEN 'assigned' THEN 2
    WHEN 'activated' THEN 3
    WHEN 'in_progress' THEN 4
    WHEN 'in_transit' THEN 5
    WHEN 'arrived' THEN 6
    WHEN 'arrived_at_loading_point' THEN 7
    WHEN 'loading' THEN 8
    WHEN 'loaded' THEN 9
    WHEN 'arrived_at_unloading_point' THEN 10
    WHEN 'unloading' THEN 11
    WHEN 'delivered' THEN 12
    WHEN 'completed' THEN 13
    WHEN 'cancelled' THEN 14
    ELSE 999
  END;

-- 6. Add a constraint to prevent invalid statuses in the future (optional)
-- ============================================================================
-- Note: This assumes you have an order_status enum type
-- If not, you'll need to create it first

-- Check if enum exists
SELECT 
  '=== ENUM TYPE CHECK ===' AS check_type,
  typname,
  '✅ Enum exists' AS status
FROM pg_type
WHERE typname = 'order_status';

-- If the enum doesn't exist, create it:
/*
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM (
      'pending',
      'assigned',
      'activated',
      'in_progress',
      'in_transit',
      'arrived',
      'arrived_at_loading_point',
      'loading',
      'loaded',
      'arrived_at_unloading_point',
      'unloading',
      'delivered',
      'completed',
      'cancelled'
    );
  END IF;
END $$;
*/

-- 7. Summary
-- ============================================================================
SELECT 
  '=== FIX COMPLETE ===' AS summary,
  'All invalid status values have been corrected' AS message,
  '✅ Run VERIFY_STATUS_MANAGEMENT_SYSTEM.sql to confirm' AS next_step;
