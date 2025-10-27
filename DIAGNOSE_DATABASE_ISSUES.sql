-- ============================================================================
-- DIAGNOSE TRIGGER AND CONSTRAINT ISSUES
-- ============================================================================
-- Run this FIRST to see what's wrong in your database
-- ============================================================================

-- Step 1: Show all triggers on driver_locations table
SELECT
    '=== TRIGGERS ON driver_locations ===' AS info;

SELECT
    tgname as trigger_name,
    proname as function_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'public.driver_locations'
::regclass
  AND tgname NOT LIKE 'pg_%'  -- Exclude system triggers
ORDER BY tgname;

-- Step 2: Show the problematic function if it exists
SELECT
    '=== FUNCTION CODE (if exists) ===' AS info;

SELECT
    proname as function_name,
    prosrc as function_code
FROM pg_proc
WHERE proname LIKE '%fill_driver_location%'
    OR proname LIKE '%map_location%';

-- Step 3: Check map_locations table schema
SELECT
    '=== map_locations COLUMNS ===' AS info;

SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'map_locations'
ORDER BY ordinal_position;

-- Step 4: Check driver_locations constraints
SELECT
    '=== driver_locations CONSTRAINTS ===' AS info;

SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    confrelid::regclass AS foreign_table,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.driver_locations'
::regclass
ORDER BY contype, conname;

-- Step 5: Check for invalid order_ids
SELECT
    '=== INVALID ORDER IDS COUNT ===' AS info;

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

-- Step 6: Show example invalid records
SELECT
    '=== SAMPLE INVALID RECORDS ===' AS info;

SELECT
    dl.id,
    dl.driver_id,
    dl.order_id,
    dl.created_at,
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
LIMIT 5;

-- Step 7: Summary
SELECT 
  '=== SUMMARY ===' AS info
,
(SELECT COUNT(*)
FROM pg_trigger t
WHERE tgrelid = 'public.driver_locations'
::regclass AND tgname NOT LIKE 'pg_%') as trigger_count,
(SELECT COUNT(*)
FROM pg_proc
WHERE proname LIKE '%fill_driver_location%')
as problem_function_count,
(SELECT COUNT(*)
FROM public.driver_locations
WHERE order_id IS NOT NULL AND NOT EXISTS (SELECT 1
    FROM public.orders o
    WHERE o.id = driver_locations.order_id))
as invalid_order_count;
