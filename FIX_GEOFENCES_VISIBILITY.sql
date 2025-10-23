-- Fix geofences visibility issue
-- The geofences are in the database but not visible due to RLS policies

-- ============================================================================
-- STEP 1: CHECK CURRENT GEOFENCES DATA
-- ============================================================================

-- Check enhanced_geofences table
SELECT 
  '🔍 Enhanced Geofences in database' as info,
  COUNT(*) as total_geofences,
  COUNT(*) FILTER (WHERE tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43') as for_your_tenant,
  COUNT(*) FILTER (WHERE is_active = true) as active_geofences
FROM public.enhanced_geofences;

-- Show sample geofences
SELECT 
  '📍 Sample Geofences' as info,
  id,
  name,
  center_latitude,
  center_longitude,
  tenant_id,
  is_active
FROM public.enhanced_geofences
WHERE tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- STEP 2: CHECK RLS POLICIES ON ENHANCED_GEOFENCES
-- ============================================================================

SELECT 
  '🔒 RLS Policies on enhanced_geofences' as info,
  policyname,
  cmd as operation,
  roles,
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'enhanced_geofences';

-- ============================================================================
-- STEP 3: FIX RLS POLICIES FOR ENHANCED_GEOFENCES
-- ============================================================================

-- Disable RLS temporarily
ALTER TABLE public.enhanced_geofences DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view geofences in their tenant" ON public.enhanced_geofences;
DROP POLICY IF EXISTS "Users can insert geofences in their tenant" ON public.enhanced_geofences;
DROP POLICY IF EXISTS "Users can update geofences in their tenant" ON public.enhanced_geofences;
DROP POLICY IF EXISTS "Users can delete geofences in their tenant" ON public.enhanced_geofences;
DROP POLICY IF EXISTS "Users can manage geofences in their tenant" ON public.enhanced_geofences;
DROP POLICY IF EXISTS "Service role full access" ON public.enhanced_geofences;

-- Re-enable RLS
ALTER TABLE public.enhanced_geofences ENABLE ROW LEVEL SECURITY;

-- Create new policies using the helper function
CREATE POLICY "Users can view geofences in their tenant"
ON public.enhanced_geofences
FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can insert geofences in their tenant"
ON public.enhanced_geofences
FOR INSERT
TO authenticated
WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update geofences in their tenant"
ON public.enhanced_geofences
FOR UPDATE
TO authenticated
USING (tenant_id = public.get_user_tenant_id())
WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can delete geofences in their tenant"
ON public.enhanced_geofences
FOR DELETE
TO authenticated
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Service role full access to enhanced_geofences"
ON public.enhanced_geofences
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- STEP 4: VERIFY GEOFENCES ARE NOW VISIBLE
-- ============================================================================

-- Test visibility
SELECT 
  '✅ Geofences visible to current user' as test,
  COUNT(*) as visible_geofences
FROM public.enhanced_geofences
WHERE tenant_id = public.get_user_tenant_id();

-- Show visible geofences
SELECT 
  '📍 Visible Geofences' as info,
  id,
  name,
  center_latitude,
  center_longitude,
  radius_meters,
  is_active
FROM public.enhanced_geofences
WHERE tenant_id = public.get_user_tenant_id()
ORDER BY name
LIMIT 10;

-- ============================================================================
-- STEP 5: ALSO FIX REGULAR GEOFENCES TABLE IF IT EXISTS
-- ============================================================================

-- Check if regular geofences table exists and has data
SELECT 
  '🔍 Regular Geofences table' as info,
  COUNT(*) as total_geofences
FROM public.geofences;

-- Fix RLS on regular geofences table
ALTER TABLE public.geofences DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view geofences in their tenant" ON public.geofences;
DROP POLICY IF EXISTS "Users can insert geofences in their tenant" ON public.geofences;
DROP POLICY IF EXISTS "Users can update geofences in their tenant" ON public.geofences;
DROP POLICY IF EXISTS "Service role full access to geofences" ON public.geofences;

ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view geofences in their tenant"
ON public.geofences
FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can insert geofences in their tenant"
ON public.geofences
FOR INSERT
TO authenticated
WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Service role full access to geofences"
ON public.geofences
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- STEP 6: FINAL SUMMARY
-- ============================================================================

SELECT '✅ GEOFENCES FIX COMPLETE!' as result;

SELECT 
  '📊 Summary' as info,
  (SELECT COUNT(*) FROM public.enhanced_geofences WHERE tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43') as enhanced_geofences,
  (SELECT COUNT(*) FROM public.geofences WHERE tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43') as regular_geofences,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'enhanced_geofences' AND schemaname = 'public') as enhanced_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'geofences' AND schemaname = 'public') as regular_policies;

SELECT '💡 After running this script, refresh your dashboard to see the geofences!' as note;
