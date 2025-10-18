-- 🔧 SCHEMA FIX: Add Missing Location Columns (Optional)
-- The current fix uses existing loading_point_location column
-- This script adds separate lat/lng columns if preferred

-- Check current schema
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders'
    AND column_name LIKE '%loading_point%'
ORDER BY column_name;

-- Add separate latitude/longitude columns (OPTIONAL)
-- These are not required for the current fix to work
DO $$
BEGIN
    -- Add loading point coordinates if they don't exist
    IF NOT EXISTS (
        SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'orders'
        AND column_name = 'loading_point_latitude'
    ) THEN
    ALTER TABLE orders ADD COLUMN loading_point_latitude DECIMAL
    (10, 8);
RAISE NOTICE 'Added loading_point_latitude column';
END
IF;
    
    IF NOT EXISTS (
        SELECT 1
FROM information_schema.columns
WHERE table_name = 'orders'
    AND column_name = 'loading_point_longitude'
    ) THEN
ALTER TABLE orders ADD COLUMN loading_point_longitude DECIMAL
(11, 8);
        RAISE NOTICE 'Added loading_point_longitude column';
END
IF;
    
    -- Add unloading point coordinates if they don't exist
    IF NOT EXISTS (
        SELECT 1
FROM information_schema.columns
WHERE table_name = 'orders'
    AND column_name = 'unloading_point_latitude'
    ) THEN
ALTER TABLE orders ADD COLUMN unloading_point_latitude DECIMAL
(10, 8);
        RAISE NOTICE 'Added unloading_point_latitude column';
END
IF;
    
    IF NOT EXISTS (
        SELECT 1
FROM information_schema.columns
WHERE table_name = 'orders'
    AND column_name = 'unloading_point_longitude'
    ) THEN
ALTER TABLE orders ADD COLUMN unloading_point_longitude DECIMAL
(11, 8);
        RAISE NOTICE 'Added unloading_point_longitude column';
END
IF;
END $$;

-- Verify the changes
SELECT
    'Updated schema' as result,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'orders'
    AND column_name LIKE '%point_%'
ORDER BY column_name;