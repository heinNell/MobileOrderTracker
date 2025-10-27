-- ============================================================================
-- CREATE DRIVER_LOCATIONS TABLE FOR LIVE TRACKING
-- ============================================================================
-- This migration creates the driver_locations table required for the dashboard
-- live tracking page and mobile app location updates.
--
-- Run this in your Supabase SQL Editor to fix the tracking page error.
-- ============================================================================

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop table if exists (only if you want a clean slate)
-- DROP TABLE IF EXISTS public.driver_locations CASCADE;

-- Create driver_locations table
CREATE TABLE IF NOT EXISTS public.driver_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL,
  order_id UUID,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accuracy NUMERIC, -- GPS accuracy in meters
  speed NUMERIC, -- Speed in km/h
  heading NUMERIC, -- Direction in degrees (0-360)
  is_manual_update BOOLEAN DEFAULT FALSE,
  notes TEXT
);

-- Add foreign key constraints AFTER table creation
-- This ensures the table exists first
ALTER TABLE public.driver_locations
  DROP CONSTRAINT IF EXISTS driver_locations_driver_id_fkey;

ALTER TABLE public.driver_locations
  ADD CONSTRAINT driver_locations_driver_id_fkey 
  FOREIGN KEY (driver_id) 
  REFERENCES public.users(id) 
  ON DELETE CASCADE;

ALTER TABLE public.driver_locations
  DROP CONSTRAINT IF EXISTS driver_locations_order_id_fkey;

ALTER TABLE public.driver_locations
  ADD CONSTRAINT driver_locations_order_id_fkey 
  FOREIGN KEY (order_id) 
  REFERENCES public.orders(id) 
  ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id 
  ON public.driver_locations(driver_id);

CREATE INDEX IF NOT EXISTS idx_driver_locations_order_id 
  ON public.driver_locations(order_id);

CREATE INDEX IF NOT EXISTS idx_driver_locations_timestamp 
  ON public.driver_locations(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_driver_locations_created_at 
  ON public.driver_locations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_driver_locations_lat_lng 
  ON public.driver_locations(latitude, longitude);

-- Enable Row Level Security
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Drivers can insert own location updates" ON public.driver_locations;
DROP POLICY IF EXISTS "Drivers can read own location updates" ON public.driver_locations;
DROP POLICY IF EXISTS "Admins can read tenant location updates" ON public.driver_locations;
DROP POLICY IF EXISTS "Users can read tenant driver locations" ON public.driver_locations;

-- RLS Policy 1: Drivers can insert their own location updates
CREATE POLICY "Drivers can insert own location updates" 
ON public.driver_locations 
FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() = driver_id AND 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'driver'
  )
);

-- RLS Policy 2: Drivers can read their own location updates
CREATE POLICY "Drivers can read own location updates" 
ON public.driver_locations 
FOR SELECT 
TO authenticated 
USING (auth.uid() = driver_id);

-- RLS Policy 3: Admin users can read all location updates within their tenant
CREATE POLICY "Admins can read tenant location updates" 
ON public.driver_locations 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users u1
    WHERE u1.id = auth.uid() 
    AND u1.role IN ('admin', 'dispatcher')
    AND EXISTS (
      SELECT 1 FROM public.users u2
      WHERE u2.id = driver_id 
      AND u2.tenant_id = u1.tenant_id
    )
  )
);

-- RLS Policy 4: Users can read location updates for orders in their tenant
CREATE POLICY "Users can read tenant driver locations" 
ON public.driver_locations 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users u1
    WHERE u1.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.users u2 ON o.assigned_driver_id = u2.id
      WHERE o.id = driver_locations.order_id 
      AND u2.tenant_id = u1.tenant_id
    )
  )
);

-- Create trigger function to update user's last location
CREATE OR REPLACE FUNCTION update_user_last_location()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users 
  SET last_location_update = NEW.created_at
  WHERE id = NEW.driver_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_user_last_location_trigger ON public.driver_locations;

-- Create trigger
CREATE TRIGGER update_user_last_location_trigger
  AFTER INSERT ON public.driver_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_location();

-- Enable realtime for dashboard live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;

-- Add helpful comments
COMMENT ON TABLE public.driver_locations IS 'Real-time location tracking for drivers during order delivery';
COMMENT ON COLUMN public.driver_locations.driver_id IS 'Foreign key to users table';
COMMENT ON COLUMN public.driver_locations.order_id IS 'Foreign key to orders table';
COMMENT ON COLUMN public.driver_locations.latitude IS 'Latitude coordinate (WGS84)';
COMMENT ON COLUMN public.driver_locations.longitude IS 'Longitude coordinate (WGS84)';
COMMENT ON COLUMN public.driver_locations.accuracy IS 'GPS accuracy in meters';
COMMENT ON COLUMN public.driver_locations.speed IS 'Speed in km/h';
COMMENT ON COLUMN public.driver_locations.heading IS 'Direction in degrees (0-360)';

-- Verify table creation
SELECT 
  'driver_locations table created successfully' AS status,
  COUNT(*) as row_count 
FROM public.driver_locations;

-- Verify foreign keys
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS foreign_table
FROM pg_constraint
WHERE conrelid = 'public.driver_locations'::regclass
  AND contype = 'f';

-- Verify indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'driver_locations'
  AND schemaname = 'public';

-- Verify RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'driver_locations';
