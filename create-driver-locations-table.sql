-- Create the missing driver_locations table for mobile app location tracking
-- This table stores real-time location updates from drivers during order delivery

-- First, ensure required extensions are enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
DO $$ 
BEGIN
    CREATE EXTENSION IF NOT EXISTS postgis;
EXCEPTION 
    WHEN undefined_file THEN 
        RAISE NOTICE 'PostGIS extension not available, using simple lat/lng columns only';
END $$;

CREATE TABLE IF NOT EXISTS public.driver_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  location GEOMETRY(POINT, 4326), -- PostGIS point for spatial queries (optional)
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

-- Create spatial index for location-based queries (only if PostGIS is available)
-- First, ensure PostGIS extension is enabled
DO $$ 
BEGIN
    -- Try to create spatial index only if PostGIS is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        CREATE INDEX IF NOT EXISTS idx_driver_locations_location ON public.driver_locations USING GIST(location);
        RAISE NOTICE 'Created spatial index on location column';
    ELSE
        RAISE NOTICE 'PostGIS not available, skipping spatial index';
    END IF;
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Could not create spatial index: %', SQLERRM;
END $$;

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
  -- Update user's last location (using PostGIS location if available, otherwise create from lat/lng)
  UPDATE public.users 
  SET 
    last_location = COALESCE(
      NEW.location, 
      -- Fallback: create PostGIS point from lat/lng if PostGIS is available
      CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') 
        THEN ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)
        ELSE NULL
      END
    ),
    last_location_update = NEW.created_at
  WHERE id = NEW.driver_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's an error with PostGIS functions, just update the timestamp
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
COMMENT ON COLUMN public.driver_locations.location IS 'PostGIS geometry point for spatial queries';
COMMENT ON COLUMN public.driver_locations.accuracy IS 'GPS accuracy in meters';
COMMENT ON COLUMN public.driver_locations.speed IS 'Speed in meters per second';
COMMENT ON COLUMN public.driver_locations.heading IS 'Direction in degrees (0-360)';
COMMENT ON COLUMN public.driver_locations.is_manual_update IS 'True if location was manually sent by driver';