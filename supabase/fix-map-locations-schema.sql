-- SQL fix for map_locations table schema
-- Run this in your Supabase SQL Editor

-- Check current table structure
\d
map_locations;

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Check and add latitude column
    IF NOT EXISTS (
        SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'map_locations'
        AND column_name = 'latitude'
        AND table_schema = 'public'
    ) THEN
    ALTER TABLE public.map_locations ADD COLUMN latitude DECIMAL
    (10, 8);
END
IF;

    -- Check and add longitude column  
    IF NOT EXISTS (
        SELECT 1
FROM information_schema.columns
WHERE table_name = 'map_locations'
    AND column_name = 'longitude'
    AND table_schema = 'public'
    ) THEN
ALTER TABLE public.map_locations ADD COLUMN longitude DECIMAL
(11, 8);
END
IF;

    -- Check and add user_id column
    IF NOT EXISTS (
        SELECT 1
FROM information_schema.columns
WHERE table_name = 'map_locations'
    AND column_name = 'user_id'
    AND table_schema = 'public'
    ) THEN
ALTER TABLE public.map_locations ADD COLUMN user_id UUID REFERENCES auth.users
(id);
END
IF;

    -- Check and add order_id column
    IF NOT EXISTS (
        SELECT 1
FROM information_schema.columns
WHERE table_name = 'map_locations'
    AND column_name = 'order_id'
    AND table_schema = 'public'
    ) THEN
ALTER TABLE public.map_locations ADD COLUMN order_id UUID REFERENCES orders
(id);
END
IF;

    -- Check and add created_at column
    IF NOT EXISTS (
        SELECT 1
FROM information_schema.columns
WHERE table_name = 'map_locations'
    AND column_name = 'created_at'
    AND table_schema = 'public'
    ) THEN
ALTER TABLE public.map_locations ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW
();
END
IF;
END $$;

-- Create index for performance
CREATE INDEX
IF NOT EXISTS idx_map_locations_order_id ON map_locations
(order_id);
CREATE INDEX
IF NOT EXISTS idx_map_locations_created_at ON map_locations
(created_at);

-- Enable RLS
ALTER TABLE map_locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY
IF NOT EXISTS "Users can view map locations for their orders" ON map_locations
FOR
SELECT USING (
  auth.uid() = user_id OR
        EXISTS (
    SELECT 1
        FROM orders
        WHERE orders.id = map_locations.order_id
            AND orders.driver_id = auth.uid()
  )
);

CREATE POLICY
IF NOT EXISTS "Users can insert their own location data" ON map_locations
FOR
INSERT WITH CHECK (auth.uid() =
user_id);