-- Create the missing driver_locations table for mobile app location tracking
-- This table stores real-time location updates from drivers during order delivery
-- Simplified version without PostGIS dependency

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.driver_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accuracy NUMERIC, -- GPS accuracy in meters
  speed NUMERIC, -- Speed in m/s
  heading NUMERIC, -- Direction in degrees (0-360)
  is_manual_update BOOLEAN DEFAULT FALSE, -- Flag for manual vs automatic updates
  notes TEXT -- Optional notes from driver
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON public.driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_order_id ON public.driver_locations(order_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_timestamp ON public.driver_locations(timestamp);
CREATE INDEX IF NOT EXISTS idx_driver_locations_created_at ON public.driver_locations(created_at);

-- Create composite index for location-based queries
CREATE INDEX IF NOT EXISTS idx_driver_locations_lat_lng ON public.driver_locations(latitude, longitude);

-- Enable Row Level Security
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for driver_locations table
-- Policy 1: Drivers can insert their own location updates
CREATE POLICY "Drivers can insert own location updates" 
ON public.driver_locations FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() = driver_id AND 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'driver'
  )
);

-- Policy 2: Drivers can read their own location updates
CREATE POLICY "Drivers can read own location updates" 
ON public.driver_locations FOR SELECT 
TO authenticated 
USING (auth.uid() = driver_id);

-- Policy 3: Admin users can read all location updates within their tenant
CREATE POLICY "Admins can read tenant location updates" 
ON public.driver_locations FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users u1
    WHERE u1.id = auth.uid() 
    AND u1.role IN ('admin', 'manager')
    AND EXISTS (
      SELECT 1 FROM public.users u2
      WHERE u2.id = driver_id 
      AND u2.tenant_id = u1.tenant_id
    )
  )
);

-- Policy 4: Users can read location updates for orders assigned to drivers in their tenant
CREATE POLICY "Users can read tenant driver locations" 
ON public.driver_locations FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users u1
    WHERE u1.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.users u2 ON o.assigned_driver_id = u2.id
      WHERE o.id = order_id 
      AND u2.tenant_id = u1.tenant_id
    )
  )
);

-- Add trigger to update the users table with last location info
CREATE OR REPLACE FUNCTION update_user_last_location()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user's last location timestamp (simplified without PostGIS dependency)
  UPDATE public.users 
  SET last_location_update = NEW.created_at
  WHERE id = NEW.driver_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update user's last location
CREATE TRIGGER update_user_last_location_trigger
  AFTER INSERT ON public.driver_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_location();

-- Add helpful comments
COMMENT ON TABLE public.driver_locations IS 'Real-time location tracking for drivers during order delivery';
COMMENT ON COLUMN public.driver_locations.latitude IS 'Latitude coordinate (WGS84)';
COMMENT ON COLUMN public.driver_locations.longitude IS 'Longitude coordinate (WGS84)';
COMMENT ON COLUMN public.driver_locations.accuracy IS 'GPS accuracy in meters';
COMMENT ON COLUMN public.driver_locations.speed IS 'Speed in meters per second';
COMMENT ON COLUMN public.driver_locations.heading IS 'Direction in degrees (0-360)';
COMMENT ON COLUMN public.driver_locations.is_manual_update IS 'True if location was manually sent by driver';

-- Test the table creation
SELECT 'driver_locations table created successfully' AS status;