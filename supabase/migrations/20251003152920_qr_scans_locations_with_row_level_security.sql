-- Create location tables for Google Maps integration
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  address TEXT,
  place_name TEXT,
  place_id TEXT, -- Google Maps Place ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing QR code scans with location data
CREATE TABLE public.qr_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  qr_data TEXT NOT NULL,
  location_id UUID REFERENCES public.locations(id),
  scan_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add a GIS extension for advanced spatial queries (optional)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add a geography column to the locations table for spatial queries
ALTER TABLE public.locations ADD COLUMN geog GEOGRAPHY(POINT);

-- Create a function to automatically populate the geography column
CREATE OR REPLACE FUNCTION update_location_geography()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geog = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function
CREATE TRIGGER update_location_geography_trigger
BEFORE INSERT OR UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION update_location_geography();

-- Set up Row Level Security
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;

-- Create policies for locations table
CREATE POLICY "Users can insert their own locations" 
ON public.locations FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own locations" 
ON public.locations FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can read their own locations" 
ON public.locations FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Create policies for qr_scans table
CREATE POLICY "Users can insert their own scans" 
ON public.qr_scans FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own scans" 
ON public.qr_scans FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Create an index for faster spatial queries
CREATE INDEX locations_geog_idx ON public.locations USING GIST (geog);

