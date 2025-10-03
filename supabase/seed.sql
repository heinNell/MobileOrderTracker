-- Check the ACTUAL structure of your orders table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'orders'
ORDER BY ordinal_position;

-- Check users/profiles table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('users', 'profiles')
ORDER BY table_name, ordinal_position;

-- Check tenants table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'tenants'
ORDER BY ordinal_position;

-- Step 1: Enable Required Extensions
-- Run this FIRST before running schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS extension (required for geography and geometry types)
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Verify extensions are installed
SELECT 
    extname AS "Extension Name",
    extversion AS "Version"
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'postgis')
ORDER BY extname;

-- Check Database Structure
-- Run this to see what tables and columns actually exist

-- Check if tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'tenants', 'orders', 'location_updates')
ORDER BY table_name;

-- Check columns in users table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY ordinal_position;

-- Check columns in orders table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'orders'
ORDER BY ordinal_position;

-- Check existing RLS policies
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check if PostGIS is available and enable it
-- Run this FIRST before anything else

-- Check what extensions are available
SELECT 
    name,
    default_version,
    installed_version,
    comment
FROM pg_available_extensions
WHERE name IN ('postgis', 'uuid-ossp', 'postgis_topology')
ORDER BY name;

-- Try to enable PostGIS
CREATE EXTENSION IF NOT EXISTS "postgis" CASCADE;

-- Try to enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify they are now enabled
SELECT 
    extname AS "Extension",
    extversion AS "Version"
FROM pg_extension
WHERE extname IN ('postgis', 'uuid-ossp')
ORDER BY extname;

-- Step 1: Check if the tenant exists
SELECT id, name FROM public.tenants WHERE id = '17ed751d-9c45-4cbb-9ccc-50607c151d43';

-- Step 2: If tenant doesn't exist, create it with subdomain:
INSERT INTO public.tenants (id, name, subdomain) 
VALUES ('17ed751d-9c45-4cbb-9ccc-50607c151d43', 'Test Company', 'testcompany')
ON CONFLICT (id) DO NOTHING;

-- Step 3: Update the user to ensure it's properly linked
UPDATE public.users 
SET 
  email = 'heinrich@matanuska.co.za',
  full_name = 'Admin User',
  role = 'admin',
  tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43',
  is_active = true
WHERE id = '17ed751d-9c45-4cbb-9ccc-50607c151d43';

-- Step 4: Verify the setup
SELECT 
  u.id, 
  u.email, 
  u.full_name, 
  u.role, 
  u.tenant_id, 
  u.is_active, 
  t.name as tenant_name
FROM public.users u
JOIN public.tenants t ON u.tenant_id = t.id
WHERE u.id = '17ed751d-9c45-4cbb-9ccc-50607c151d43';

-- Step 5: Verify auth user exists
SELECT id, email FROM auth.users WHERE id = '17ed751d-9c45-4cbb-9ccc-50607c151d43';
INSERT INTO public.orders (
  tenant_id, order_number, sku, qr_code_data, qr_code_signature, qr_code_expires_at,
  loading_point_name, loading_point_address, loading_point_location,
  unloading_point_name, unloading_point_address, unloading_point_location,
  status, assigned_driver_id, created_by
) VALUES (
  '17ed751d-9c45-4cbb-9ccc-50607c151d43',  -- Tenant ID
  'ORD-001', 'SKU-TEST-123', 'qr-data-sample', 'signature-hash', NOW() + INTERVAL '1 day',
  'Warehouse A', '123 Main St, City', 'POINT(-122.084 37.422)',  -- Stored as TEXT
  'Client Site B', '456 Elm St, Town', 'POINT(-122.000 37.400)',  -- Stored as TEXT
  'pending', NULL, '17ed751d-9c45-4cbb-9ccc-50607c151d43'  -- Replace with real UUID
);

CREATE INDEX idx_orders_order_number ON public.orders (order_number);
CREATE INDEX idx_orders_status ON public.orders (status);

INSERT INTO public.orders (
  tenant_id, order_number, sku, qr_code_data, qr_code_signature, qr_code_expires_at,
  loading_point_name, loading_point_address, loading_point_location,
  unloading_point_name, unloading_point_address, unloading_point_location,
  status, assigned_driver_id, created_by
) VALUES (
  '17ed751d-9c45-4cbb-9ccc-50607c151d43', -- tenant_id
  'ORD-0001',                             -- order_number
  'SKU-123',                              -- sku
  'some-qr-data',                         -- qr_code_data
  'sig-abc',                              -- qr_code_signature
  '2025-10-10T00:00:00Z',                 -- qr_code_expires_at (timestamptz)
  'Warehouse A',                          -- loading_point_name
  '123 Loading St',                       -- loading_point_address
  'POINT(1 2)',                           -- loading_point_location (text in your schema)
  'Store B',                              -- unloading_point_name
  '456 Unload Ave',                       -- unloading_point_address
  'POINT(3 4)',                           -- unloading_point_location
  'pending',                              -- status
  NULL,                                   -- assigned_driver_id
  'a1b2c3d4-5678-90ab-cdef-111111111111'  -- created_by
);
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  order_number TEXT NOT NULL,
  sku TEXT NOT NULL,
  qr_code_data TEXT NOT NULL,
  qr_code_signature TEXT NOT NULL,
  qr_code_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  loading_point_name TEXT NOT NULL,
  loading_point_address TEXT NOT NULL,
  loading_point_location GEOGRAPHY NOT NULL,
  unloading_point_name TEXT NOT NULL,
  unloading_point_address TEXT NOT NULL,
  unloading_point_location GEOGRAPHY NOT NULL,
  status TEXT NOT NULL,
  assigned_driver_id UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.orders (
  tenant_id, order_number, sku, qr_code_data, qr_code_signature, qr_code_expires_at,
  loading_point_name, loading_point_address, loading_point_location,
  unloading_point_name, unloading_point_address, unloading_point_location,
  status, assigned_driver_id, created_by
) VALUES (
  '17ed751d-9c45-4cbb-9ccc-50607c151d43',  -- tenant_id (valid UUID)
  'ORD-001', 'SKU-TEST-123', 'qr-data-sample', 'signature-hash', NOW() + INTERVAL '1 day',
  'Warehouse A', '123 Main St, City', 'POINT(-122.084 37.422)',
  'Client Site B', '456 Elm St, Town', 'POINT(-122.000 37.400)',
  'pending', NULL, 'a1b2c3d4-5678-90ab-cdef-111111111111'
);
CREATE TABLE public.qr_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_data TEXT NOT NULL,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up permissions
ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow inserts
CREATE POLICY "Allow inserts for authenticated users" 
ON public.qr_scans FOR INSERT 
TO authenticated 
WITH CHECK (true);

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

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  order_number text NOT NULL,
  sku text,
  qr_code_data text,
  qr_code_signature text,
  qr_code_expires_at timestamptz,
  loading_point_name text,
  loading_point_address text,
  loading_point_location text,
  unloading_point_name text,
  unloading_point_address text,
  unloading_point_location text,
  status text,
  assigned_driver_id uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
