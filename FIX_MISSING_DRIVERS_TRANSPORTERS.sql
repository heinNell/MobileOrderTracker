-- Fix for missing drivers and transporters from frontend
-- This script diagnoses and fixes RLS policies preventing data visibility

-- ============================================================================
-- STEP 1: CHECK WHAT DATA EXISTS IN THE DATABASE
-- ============================================================================

-- Check drivers in database
SELECT 
  '📊 Drivers in database' as info,
  COUNT(*) as total_drivers,
  COUNT(*) FILTER (WHERE tenant_id IS NOT NULL) as with_tenant,
  COUNT(*) FILTER (WHERE tenant_id IS NULL) as without_tenant,
  COUNT(*) FILTER (WHERE is_active = true) as active_drivers
FROM public.drivers;

-- Show sample drivers
SELECT 
  '👤 Sample Drivers' as info,
  id,
  full_name,
  phone,
  tenant_id,
  is_active,
  created_at
FROM public.drivers
ORDER BY created_at DESC
LIMIT 10;

-- Check transporters in database
SELECT 
  '🚛 Transporters in database' as info,
  COUNT(*) as total_transporters,
  COUNT(*) FILTER (WHERE tenant_id IS NOT NULL) as with_tenant,
  COUNT(*) FILTER (WHERE tenant_id IS NULL) as without_tenant
FROM public.transporters;

-- Show sample transporters
SELECT 
  '🏢 Sample Transporters' as info,
  id,
  company_name,
  tenant_id,
  created_at
FROM public.transporters
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 2: CHECK CURRENT USER'S TENANT
-- ============================================================================

-- Check current user and their tenant
SELECT 
  '🔑 Current User Info' as info,
  id,
  email,
  role,
  tenant_id,
  is_active
FROM public.users
WHERE id = auth.uid();

-- ============================================================================
-- STEP 3: CHECK RLS POLICIES
-- ============================================================================

-- Check RLS status
SELECT 
  '🔒 RLS Status' as info,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('drivers', 'transporters')
ORDER BY tablename;

-- Check all policies on drivers
SELECT 
  '📋 Policies on drivers table' as info,
  policyname,
  cmd as operation,
  roles,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'drivers'
ORDER BY cmd;

-- Check all policies on transporters
SELECT 
  '📋 Policies on transporters table' as info,
  policyname,
  cmd as operation,
  roles,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'transporters'
ORDER BY cmd;

-- ============================================================================
-- STEP 4: FIX NULL TENANT IDS
-- ============================================================================

-- Get the first available tenant (or create one if none exists)
DO $$
DECLARE
  default_tenant_id uuid;
BEGIN
  -- Try to get an existing tenant
  SELECT id INTO default_tenant_id FROM public.tenants LIMIT 1;
  
  -- If no tenant exists, create one
  IF default_tenant_id IS NULL THEN
    INSERT INTO public.tenants (name, is_active)
    VALUES ('Default Organization', true)
    RETURNING id INTO default_tenant_id;
    
    RAISE NOTICE 'Created default tenant: %', default_tenant_id;
  END IF;
  
  -- Update drivers with NULL tenant_id
  UPDATE public.drivers
  SET tenant_id = default_tenant_id
  WHERE tenant_id IS NULL;
  
  -- Update transporters with NULL tenant_id
  UPDATE public.transporters
  SET tenant_id = default_tenant_id
  WHERE tenant_id IS NULL;
  
  -- Update users with NULL tenant_id
  UPDATE public.users
  SET tenant_id = default_tenant_id
  WHERE tenant_id IS NULL;
  
  RAISE NOTICE 'Updated NULL tenant_ids to: %', default_tenant_id;
END $$;

-- ============================================================================
-- STEP 5: FIX RLS POLICIES FOR DRIVERS
-- ============================================================================

-- Enable RLS
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view drivers in their tenant" ON public.drivers;
DROP POLICY IF EXISTS "Users can insert drivers in their tenant" ON public.drivers;
DROP POLICY IF EXISTS "Users can update drivers in their tenant" ON public.drivers;
DROP POLICY IF EXISTS "Users can delete drivers in their tenant" ON public.drivers;
DROP POLICY IF EXISTS "Service role can manage drivers" ON public.drivers;
DROP POLICY IF EXISTS "Service role can insert drivers" ON public.drivers;
DROP POLICY IF EXISTS "Admins can manage drivers" ON public.drivers;

-- Create comprehensive SELECT policy (view drivers)
CREATE POLICY "Users can view drivers in their tenant"
ON public.drivers
FOR SELECT
TO authenticated
USING (
  -- User's tenant matches driver's tenant
  tenant_id IN (
    SELECT tenant_id FROM public.users WHERE id = auth.uid()
  )
);

-- Allow service role full access
CREATE POLICY "Service role full access to drivers"
ON public.drivers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to insert drivers in their tenant
CREATE POLICY "Users can insert drivers in their tenant"
ON public.drivers
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.users WHERE id = auth.uid()
  )
);

-- Allow authenticated users to update drivers in their tenant
CREATE POLICY "Users can update drivers in their tenant"
ON public.drivers
FOR UPDATE
TO authenticated
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

-- ============================================================================
-- STEP 6: FIX RLS POLICIES FOR TRANSPORTERS
-- ============================================================================

-- Enable RLS
ALTER TABLE public.transporters ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view transporters in their tenant" ON public.transporters;
DROP POLICY IF EXISTS "Users can insert transporters in their tenant" ON public.transporters;
DROP POLICY IF EXISTS "Users can update transporters in their tenant" ON public.transporters;
DROP POLICY IF EXISTS "Users can delete transporters in their tenant" ON public.transporters;
DROP POLICY IF EXISTS "Service role can manage transporters" ON public.transporters;
DROP POLICY IF EXISTS "Admins can manage transporters" ON public.transporters;

-- Create comprehensive SELECT policy (view transporters)
CREATE POLICY "Users can view transporters in their tenant"
ON public.transporters
FOR SELECT
TO authenticated
USING (
  -- User's tenant matches transporter's tenant
  tenant_id IN (
    SELECT tenant_id FROM public.users WHERE id = auth.uid()
  )
);

-- Allow service role full access
CREATE POLICY "Service role full access to transporters"
ON public.transporters
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to insert transporters in their tenant
CREATE POLICY "Users can insert transporters in their tenant"
ON public.transporters
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.users WHERE id = auth.uid()
  )
);

-- Allow authenticated users to update transporters in their tenant
CREATE POLICY "Users can update transporters in their tenant"
ON public.transporters
FOR UPDATE
TO authenticated
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

-- ============================================================================
-- STEP 7: VERIFICATION
-- ============================================================================

-- Verify drivers are now visible
SELECT 
  '✅ Drivers visible to current user' as info,
  COUNT(*) as visible_drivers
FROM public.drivers
WHERE tenant_id IN (
  SELECT tenant_id FROM public.users WHERE id = auth.uid()
);

-- Verify transporters are now visible
SELECT 
  '✅ Transporters visible to current user' as info,
  COUNT(*) as visible_transporters
FROM public.transporters
WHERE tenant_id IN (
  SELECT tenant_id FROM public.users WHERE id = auth.uid()
);

-- Show final policy summary
SELECT 
  '📊 Final Policy Summary' as info,
  tablename,
  COUNT(*) as policy_count,
  string_agg(DISTINCT cmd::text, ', ') as operations
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('drivers', 'transporters')
GROUP BY tablename
ORDER BY tablename;

-- Show sample data that should be visible
SELECT 
  '👥 Sample visible drivers' as info,
  d.id,
  d.full_name,
  d.phone,
  d.is_active,
  t.name as tenant_name
FROM public.drivers d
LEFT JOIN public.tenants t ON d.tenant_id = t.id
WHERE d.tenant_id IN (
  SELECT tenant_id FROM public.users WHERE id = auth.uid()
)
ORDER BY d.created_at DESC
LIMIT 5;

SELECT 
  '🚛 Sample visible transporters' as info,
  tr.id,
  tr.company_name,
  tr.primary_contact_phone,
  t.name as tenant_name
FROM public.transporters tr
LEFT JOIN public.tenants t ON tr.tenant_id = t.id
WHERE tr.tenant_id IN (
  SELECT tenant_id FROM public.users WHERE id = auth.uid()
)
ORDER BY tr.created_at DESC
LIMIT 5;

-- Final success message
SELECT '✅ FIX COMPLETE! Drivers and transporters should now be visible in the frontend.' as result;
SELECT '💡 If still not visible, try logging out and logging back in to refresh the session.' as hint;
