-- Add missing columns to orders table
-- Run this to add all the columns we need

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS estimated_distance_km NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_end_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
ADD COLUMN IF NOT EXISTS special_handling_instructions TEXT,
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS waypoints JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS loading_time_window_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS loading_time_window_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS unloading_time_window_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS unloading_time_window_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Verify the columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'orders'
ORDER BY ordinal_position;
