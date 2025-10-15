-- Fix driver_locations unique constraint issue
-- The table has a unique constraint preventing multiple location records per driver
-- This script provides options to either remove the constraint or modify the app to use upsert

-- First, check what constraints exist
SELECT
    'Current constraints on driver_locations:' as info;

SELECT
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.driver_locations'
::regclass
ORDER BY conname;

-- Check indexes
SELECT
    'Current indexes on driver_locations:' as info;

SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'driver_locations'
    AND schemaname = 'public'
ORDER BY indexname;

-- OPTION 1: Drop the unique constraint (Recommended for location tracking history)
-- This allows multiple location records per driver over time
DROP INDEX IF EXISTS public.uq_driver_locations_driver_id;

-- Verify constraint is removed
SELECT
    'Constraint removed - driver can now have multiple location records' as status;

-- Create a non-unique index for better query performance
CREATE INDEX
IF NOT EXISTS idx_driver_locations_driver_id_timestamp 
ON public.driver_locations
(driver_id, timestamp DESC);

-- OPTION 2 (Alternative): Keep constraint and use upsert pattern
-- If you want to keep only the latest location per driver, run this instead:
/*
-- Keep the unique constraint but create a function to get latest location
CREATE OR REPLACE VIEW driver_latest_locations AS
SELECT DISTINCT ON (driver_id)
    id,
    driver_id,
    order_id,
    latitude,
    longitude,
    location,
    accuracy,
    accuracy_meters,
    speed,
    speed_kmh,
    heading,
    timestamp,
    created_at,
    is_manual_update,
    notes
FROM public.driver_locations
ORDER BY driver_id, timestamp DESC, created_at DESC;

-- Grant access to the view
GRANT SELECT ON driver_latest_locations TO authenticated;
*/

-- Show final state
SELECT
    'Checking final state...' as info;

SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'driver_locations'
    AND schemaname = 'public'
ORDER BY indexname;

SELECT
    'Fix completed - drivers can now send multiple location updates' as result;
