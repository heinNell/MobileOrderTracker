-- ============================================================================
-- FIX DRIVER_LOCATIONS FOREIGN KEY RELATIONSHIP
-- ============================================================================
-- This script verifies and fixes the foreign key relationship between
-- driver_locations and users tables.
--
-- Run this in your Supabase SQL Editor.
-- ============================================================================

-- Step 1: Check if driver_locations table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'driver_locations'
  ) THEN
    RAISE NOTICE 'driver_locations table EXISTS';
  ELSE
    RAISE NOTICE 'driver_locations table DOES NOT EXIST - need to create it';
  END IF;
END $$;

-- Step 2: Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.driver_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL,
  order_id UUID,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accuracy NUMERIC,
  speed NUMERIC,
  heading NUMERIC,
  is_manual_update BOOLEAN DEFAULT FALSE,
  notes TEXT
);

-- Step 3: Drop existing foreign key constraints if they exist
ALTER TABLE public.driver_locations
  DROP CONSTRAINT IF EXISTS driver_locations_driver_id_fkey;

ALTER TABLE public.driver_locations
  DROP CONSTRAINT IF EXISTS driver_locations_order_id_fkey;

-- Step 4: Add the foreign key constraints back
ALTER TABLE public.driver_locations
  ADD CONSTRAINT driver_locations_driver_id_fkey 
  FOREIGN KEY (driver_id) 
  REFERENCES public.users(id) 
  ON DELETE CASCADE;

-- Make order_id foreign key optional (SET NULL instead of CASCADE)
-- This allows location tracking even if order doesn't exist
ALTER TABLE public.driver_locations
  ADD CONSTRAINT driver_locations_order_id_fkey 
  FOREIGN KEY (order_id) 
  REFERENCES public.orders(id) 
  ON DELETE SET NULL;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id 
  ON public.driver_locations(driver_id);

CREATE INDEX IF NOT EXISTS idx_driver_locations_order_id 
  ON public.driver_locations(order_id);

CREATE INDEX IF NOT EXISTS idx_driver_locations_timestamp 
  ON public.driver_locations(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_driver_locations_created_at 
  ON public.driver_locations(created_at DESC);

-- Step 6: Enable Row Level Security
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Step 7: Drop existing policies
DROP POLICY IF EXISTS "Drivers can insert own location updates" ON public.driver_locations;
DROP POLICY IF EXISTS "Drivers can read own location updates" ON public.driver_locations;
DROP POLICY IF EXISTS "Admins can read all location updates" ON public.driver_locations;
DROP POLICY IF EXISTS "Users can read location updates" ON public.driver_locations;

-- Step 8: Create simplified RLS policies
-- Policy 1: Authenticated users can insert with their own driver_id
CREATE POLICY "Drivers can insert own location updates" 
ON public.driver_locations 
FOR INSERT 
TO authenticated 
WITH CHECK (driver_id = auth.uid());

-- Policy 2: Authenticated users can read all location updates (for tracking)
CREATE POLICY "Users can read location updates" 
ON public.driver_locations 
FOR SELECT 
TO authenticated 
USING (true);

-- Step 8b: Create a trigger to validate order_id before insert
CREATE OR REPLACE FUNCTION validate_driver_location_order()
RETURNS TRIGGER AS $$
BEGIN
  -- If order_id is provided, check if it exists
  IF NEW.order_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = NEW.order_id) THEN
      -- Log the invalid order_id but allow the insert with NULL
      RAISE WARNING 'Order ID % does not exist, setting to NULL', NEW.order_id;
      NEW.order_id := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_driver_location_order_trigger ON public.driver_locations;

CREATE TRIGGER validate_driver_location_order_trigger
  BEFORE INSERT ON public.driver_locations
  FOR EACH ROW
  EXECUTE FUNCTION validate_driver_location_order();

-- Step 9: Enable realtime for dashboard live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;

-- Step 10: Verify the foreign keys exist
SELECT
  'SUCCESS: Foreign keys verified' AS status,
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS foreign_table
FROM pg_constraint
WHERE conrelid = 'public.driver_locations'::regclass
  AND contype = 'f';

-- Step 11: Check table structure
SELECT 
  'Table structure:' AS info,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'driver_locations'
ORDER BY ordinal_position;

-- Step 12: Check RLS policies
SELECT
  'RLS Policies:' AS info,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'driver_locations';
