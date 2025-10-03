-- Create location table for Google Maps integration without PostGIS
CREATE TABLE IF NOT EXISTS public.map_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  address TEXT,
  place_name TEXT,
  place_id TEXT, -- Google Maps Place ID
  location_type TEXT, -- e.g., 'home', 'work', 'favorite', etc.
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security
ALTER TABLE public.map_locations ENABLE ROW LEVEL SECURITY;

-- Create policies for map_locations table
CREATE POLICY "Users can insert their own map locations" 
ON public.map_locations FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own map locations" 
ON public.map_locations FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can read their own map locations" 
ON public.map_locations FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Create a function to find nearby locations without PostGIS
-- This uses the Haversine formula to calculate distances
CREATE OR REPLACE FUNCTION find_nearby_map_locations(lat FLOAT, lng FLOAT, radius_meters FLOAT)
RETURNS SETOF map_locations AS $$
DECLARE
  earth_radius_meters CONSTANT FLOAT := 6371000; -- Earth's radius in meters
BEGIN
  RETURN QUERY
  SELECT *
  FROM map_locations
  WHERE user_id = auth.uid()
  AND (
    -- Haversine formula
    2 * earth_radius_meters * asin(
      sqrt(
        sin(radians(latitude - lat)/2)^2 +
        cos(radians(lat)) * cos(radians(latitude)) * sin(radians(longitude - lng)/2)^2
      )
    ) <= radius_meters
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a table for saved routes
CREATE TABLE IF NOT EXISTS public.map_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  route_name TEXT,
  origin_lat NUMERIC NOT NULL,
  origin_lng NUMERIC NOT NULL,
  destination_lat NUMERIC NOT NULL,
  destination_lng NUMERIC NOT NULL,
  waypoints JSONB, -- Array of lat/lng points for waypoints
  distance_meters INTEGER,
  duration_seconds INTEGER,
  route_polyline TEXT, -- Encoded polyline of the route
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security for routes
ALTER TABLE public.map_routes ENABLE ROW LEVEL SECURITY;

-- Create policies for map_routes table
CREATE POLICY "Users can insert their own routes" 
ON public.map_routes FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own routes" 
ON public.map_routes FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can read their own routes" 
ON public.map_routes FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

