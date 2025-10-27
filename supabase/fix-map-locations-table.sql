-- CRITICAL FIX: Live Map & Real-Time Tracking System
-- This fixes the map_locations table and enables full tracking functionality
-- Run this in your Supabase SQL Editor IMMEDIATELY

-- Step 1: Check current map_locations table structure
SELECT
    'Current map_locations table structure:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'map_locations'
ORDER BY ordinal_position;

-- Fix the name column to be nullable
DO $$ 
BEGIN
    -- Check if name column exists and is NOT NULL
    IF EXISTS (
        SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'map_locations'
        AND column_name = 'name'
        AND table_schema = 'public'
        AND is_nullable = 'NO'
    ) THEN
    -- Make name column nullable
    ALTER TABLE public.map_locations ALTER COLUMN name DROP NOT NULL;
RAISE NOTICE 'Made name column nullable in map_locations table';
    ELSE
        RAISE NOTICE 'name column is already nullable or does not exist';
END
IF;

    -- Also check if we need to add the name column as nullable if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
FROM information_schema.columns
WHERE table_name = 'map_locations'
    AND column_name = 'name'
    AND table_schema = 'public'
    ) THEN
ALTER TABLE public.map_locations ADD COLUMN name TEXT;
        RAISE NOTICE 'Added nullable name column to map_locations table';
END
IF;
END $$;

-- Verify the fix
SELECT
    'After fix - map_locations table structure:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'map_locations'
ORDER BY ordinal_position;