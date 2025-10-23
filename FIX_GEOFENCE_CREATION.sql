--- Step 4: Create a trigger function to automatically set the location from lat/lng
CREATE OR REPLACE FUNCTION set_geofence_location()
RETURNS TRIGGER AS $$
BEGIN
  -- If latitude and longitude are provided, create the location point
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  
  -- If location is provided but lat/lng are not, extract them
  IF NEW.location IS NOT NULL AND (NEW.latitude IS NULL OR NEW.longitude IS NULL) THEN
    NEW.latitude = ST_Y(NEW.location::geometry);
    NEW.longitude = ST_X(NEW.location::geometry);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_geofence_location ON public.geofences;

-- Step 5: Create the trigger
CREATE TRIGGER trigger_set_geofence_location
  BEFORE INSERT OR UPDATE ON public.geofences
  FOR EACH ROW
  EXECUTE FUNCTION set_geofence_location();

-- Step 5b: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_geofence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_geofence_timestamp ON public.geofences;

-- Create the trigger for updated_at
CREATE TRIGGER trigger_update_geofence_timestamp
  BEFORE UPDATE ON public.geofences
  FOR EACH ROW
  EXECUTE FUNCTION update_geofence_updated_at();

-- Step 6: Add a check constraint to ensure either location OR lat/lng is provided
-- (The trigger will set location from lat/lng automatically)
ALTER TABLE public.geofences
DROP CONSTRAINT IF EXISTS check_geofence_location;

ALTER TABLE public.geofences
ADD CONSTRAINT check_geofence_location
CHECK (
  latitude IS NOT NULL AND longitude IS NOT NULL
);

-- Step 7: Check and fix RLS policies on geofences table
-- Enable RLS if not already enabled
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view geofences in their tenant" ON public.geofences;
DROP POLICY IF EXISTS "Users can insert geofences in their tenant" ON public.geofences;
DROP POLICY IF EXISTS "Users can update geofences in their tenant" ON public.geofences;
DROP POLICY IF EXISTS "Users can delete geofences in their tenant" ON public.geofences;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view geofences in their tenant"
ON public.geofences FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert geofences in their tenant"
ON public.geofences FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update geofences in their tenant"
ON public.geofences FOR UPDATE
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.users WHERE id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete geofences in their tenant"
ON public.geofences FOR DELETE
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.users WHERE id = auth.uid()
  )
);

-- Step 8: Create index on latitude and longitude for performance
CREATE INDEX IF NOT EXISTS idx_geofences_lat_lng ON public.geofences(latitude, longitude);

-- Step 9: Verify the setup
SELECT 
  'Geofence table setup verification' as status,
  COUNT(*) FILTER (WHERE column_name = 'latitude') as has_latitude,
  COUNT(*) FILTER (WHERE column_name = 'longitude') as has_longitude,
  COUNT(*) FILTER (WHERE column_name = 'location') as has_location
FROM information_schema.columns
WHERE table_name = 'geofences' AND table_schema = 'public';

-- Verify RLS is enabled
SELECT 
  'RLS Status' as info,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'geofences';

-- Show all policies
SELECT 
  'Active Policies' as info,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'geofences';

-- Show triggers
SELECT 
  'Active Triggers' as info,
  trigger_name,
  event_manipulation as event
FROM information_schema.triggers
WHERE event_object_schema = 'public' 
  AND event_object_table = 'geofences';

COMMENT ON TRIGGER trigger_set_geofence_location ON public.geofences IS 
  'Automatically converts latitude/longitude to PostGIS geography point and vice versa';
