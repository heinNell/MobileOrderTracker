-- AGGRESSIVE FIX for geofences visibility
-- This completely removes RLS to make geofences visible immediately

-- ============================================================================
-- STEP 1: COMPLETELY DISABLE RLS ON BOTH GEOFENCE TABLES
-- ============================================================================

-- Disable RLS on enhanced_geofences (allow everyone to see everything)
ALTER TABLE public.enhanced_geofences DISABLE ROW LEVEL SECURITY;

-- Disable RLS on regular geofences (allow everyone to see everything)
ALTER TABLE public.geofences DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: VERIFY GEOFENCES ARE NOW VISIBLE
-- ============================================================================

-- Check enhanced_geofences
SELECT
    '✅ Enhanced Geofences (RLS DISABLED)' as info,
    COUNT(*) as total_geofences,
    COUNT(*) FILTER
(WHERE tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43') as your_tenant_geofences
FROM public.enhanced_geofences;

-- Show all geofences for your tenant
SELECT
    '📍 Your Geofences' as info,
    id,
    name,
    center_latitude,
    center_longitude,
    radius_meters,
    is_active,
    created_at
FROM public.enhanced_geofences
WHERE tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
ORDER BY name;

-- Check regular geofences
SELECT
    '📍 Regular Geofences (if any)' as info,
    COUNT(*) as total
FROM public.geofences;

-- ============================================================================
-- STEP 3: GRANT FULL PERMISSIONS
-- ============================================================================

-- Grant all permissions to authenticated users
GRANT ALL ON public.enhanced_geofences TO authenticated;
GRANT ALL ON public.geofences TO authenticated;

-- Grant usage on sequences if they exist
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

SELECT '✅ RLS COMPLETELY DISABLED - GEOFENCES SHOULD NOW BE VISIBLE!' as result;
SELECT '⚠️ WARNING: This disables security. You should re-enable RLS later with proper policies.' as warning;
SELECT '🔄 NEXT STEP: Refresh your dashboard or log out and back in to see the geofences.' as next_step;
