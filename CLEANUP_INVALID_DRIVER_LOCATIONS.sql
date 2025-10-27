-- ============================================================================
-- CLEANUP INVALID DRIVER LOCATIONS
-- ============================================================================
-- This script cleans up driver_locations with invalid order_ids
-- and makes the table more resilient
-- ============================================================================

-- Step 1: Show how many invalid records exist
SELECT
    'Checking for invalid order_ids in driver_locations...' AS status;

SELECT
    COUNT(*) as invalid_count,
    COUNT(DISTINCT driver_id) as affected_drivers
FROM public.driver_locations dl
WHERE dl.order_id IS NOT NULL
    AND NOT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = dl.order_id
  );

-- Step 2: Show some examples of invalid records
SELECT
    '--- Example Invalid Records ---' AS separator;

SELECT
    dl.id,
    dl.driver_id,
    dl.order_id,
    dl.created_at,
    u.full_name as driver_name,
    u.email as driver_email
FROM public.driver_locations dl
    LEFT JOIN public.users u ON dl.driver_id = u.id
WHERE dl.order_id IS NOT NULL
    AND NOT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = dl.order_id
  )
ORDER BY dl.created_at DESC
LIMIT 10;

-- Step 3: Set invalid order_ids to NULL
UPDATE public.driver_locations
SET order_id
= NULL
WHERE order_id IS NOT NULL
  AND NOT EXISTS
(
    SELECT 1
FROM public.orders o
WHERE o.id = driver_locations.order_id
  );

-- Step 4: Show results
SELECT
    'Cleanup complete!' AS status,
    (SELECT COUNT(*)
    FROM public.driver_locations
    WHERE order_id IS NULL) as null_order_count,
    (SELECT COUNT(*)
    FROM public.driver_locations
    WHERE order_id IS NOT NULL) as valid_order_count;

-- Step 5: Verify all remaining order_ids are valid
SELECT
    'Verification - All remaining order_ids should be valid:' AS status;

SELECT
    CASE 
    WHEN COUNT(*) = 0 THEN '✅ All order_ids are now valid'
    ELSE '❌ Still have ' || COUNT(*) || ' invalid order_ids'
  END as result
FROM public.driver_locations dl
WHERE dl.order_id IS NOT NULL
    AND NOT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = dl.order_id
  );
