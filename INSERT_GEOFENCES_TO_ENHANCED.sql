-- Insert geofences from regular 'geofences' table into 'enhanced_geofences' table
-- This script converts the 100 geofence records to the enhanced schema format

-- First, let's check the actual schema of enhanced_geofences to see what columns exist
-- Run this to see the structure:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns 
-- WHERE table_name = 'enhanced_geofences' ORDER BY ordinal_position;

-- OPTION 1: If geofence_id column exists and needs a value, use this:
-- (Generates a unique geofence_id based on the name)
INSERT INTO enhanced_geofences (
  id,
  tenant_id,
  name,
  geofence_id,
  geofence_type,
  center_latitude,
  center_longitude,
  radius_meters,
  shape_type,
  is_active,
  usage_count,
  priority_level,
  trigger_event,
  notification_enabled,
  alert_enabled,
  is_template,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid() as id,  -- Generate new UUID for enhanced_geofences id
  tenant_id,
  name,
  id as geofence_id,  -- Use the original geofences.id as the foreign key
  -- Determine geofence type based on name patterns
  CASE 
    WHEN name ILIKE '%loading%' OR name ILIKE '%depot%' THEN 'loading_point'
    WHEN name ILIKE '%hospital%' THEN 'delivery_point'
    WHEN name ILIKE '%border%' THEN 'waypoint'
    WHEN name ILIKE '%toll%' THEN 'waypoint'
    WHEN name ILIKE '%truck stop%' OR name ILIKE '%truckstop%' THEN 'rest_area'
    WHEN name ILIKE '%storage%' OR name ILIKE '%warehouse%' THEN 'warehouse'
    ELSE 'custom'
  END as geofence_type,
  CAST(latitude AS NUMERIC(10,8)) as center_latitude,
  CAST(longitude AS NUMERIC(11,8)) as center_longitude,
  radius_meters,
  'circle' as shape_type,
  is_active,
  0 as usage_count,
  5 as priority_level,
  'entry' as trigger_event,
  false as notification_enabled,
  false as alert_enabled,
  false as is_template,
  created_at,
  updated_at
FROM geofences
WHERE is_active = true
  -- Only insert geofences that don't already exist in enhanced_geofences
  AND NOT EXISTS (
    SELECT 1 FROM enhanced_geofences 
    WHERE enhanced_geofences.geofence_id = geofences.id
  );

-- Verify the insert
SELECT 
  COUNT(*) as total_enhanced_geofences,
  COUNT(DISTINCT geofence_type) as unique_types,
  STRING_AGG(DISTINCT geofence_type, ', ') as geofence_types
FROM enhanced_geofences;

-- Show sample of migrated data
SELECT 
  id,
  name,
  geofence_type,
  center_latitude,
  center_longitude,
  radius_meters,
  is_active
FROM enhanced_geofences
ORDER BY name
LIMIT 10;

-- Summary by geofence type
SELECT 
  geofence_type,
  COUNT(*) as count,
  AVG(radius_meters) as avg_radius
FROM enhanced_geofences
GROUP BY geofence_type
ORDER BY count DESC;
