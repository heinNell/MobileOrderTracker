-- Diagnostic: Check geofences in both tables

-- 1. Check how many geofences are in the original table
SELECT 
  'Original geofences table' as source,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE is_active = true) as active_count
FROM geofences;

-- 2. Check how many geofences are in enhanced_geofences
SELECT 
  'Enhanced geofences table' as source,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE is_active = true) as active_count
FROM enhanced_geofences;

-- 3. Show sample data from enhanced_geofences to verify structure
SELECT 
  id,
  geofence_id,
  tenant_id,
  name,
  geofence_type,
  center_latitude,
  center_longitude,
  radius_meters,
  is_active
FROM enhanced_geofences
ORDER BY name
LIMIT 10;

-- 4. Check if tenant_id matches between both tables
SELECT 
  'Tenant ID mismatch check' as check_name,
  COUNT(*) as mismatches
FROM geofences g
LEFT JOIN enhanced_geofences eg ON eg.geofence_id = g.id
WHERE g.tenant_id != eg.tenant_id OR eg.id IS NULL;

-- 5. Verify the tenant_id used by geofences
SELECT DISTINCT 
  tenant_id,
  COUNT(*) as geofence_count
FROM geofences
GROUP BY tenant_id;

-- 6. Verify the tenant_id used by enhanced_geofences
SELECT DISTINCT 
  tenant_id,
  COUNT(*) as geofence_count
FROM enhanced_geofences
GROUP BY tenant_id;

-- 7. Check what a frontend query would return (simulating the app query)
-- Replace '00000000-0000-0000-0000-000000000001' with your actual tenant_id
SELECT 
  id, 
  name, 
  center_latitude, 
  center_longitude, 
  radius_meters, 
  geofence_type,
  is_active
FROM enhanced_geofences
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND is_active = true
ORDER BY name
LIMIT 20;
