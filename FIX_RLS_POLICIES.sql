-- Fix RLS (Row Level Security) policies to allow INSERT operations
-- Ensures users can create contacts, transporters, and templates

-- ============================================
-- CONTACTS TABLE RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own tenant contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can view their own tenant contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update their own tenant contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete their own tenant contacts" ON public.contacts;

-- SELECT policy
CREATE POLICY "Users can view their own tenant contacts"
  ON public.contacts FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- INSERT policy
CREATE POLICY "Users can insert their own tenant contacts"
  ON public.contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- UPDATE policy
CREATE POLICY "Users can update their own tenant contacts"
  ON public.contacts FOR UPDATE
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

-- DELETE policy
CREATE POLICY "Users can delete their own tenant contacts"
  ON public.contacts FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- ============================================
-- TRANSPORTERS TABLE RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own tenant transporters" ON public.transporters;
DROP POLICY IF EXISTS "Users can view their own tenant transporters" ON public.transporters;
DROP POLICY IF EXISTS "Users can update their own tenant transporters" ON public.transporters;
DROP POLICY IF EXISTS "Users can delete their own tenant transporters" ON public.transporters;

-- SELECT policy
CREATE POLICY "Users can view their own tenant transporters"
  ON public.transporters FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- INSERT policy
CREATE POLICY "Users can insert their own tenant transporters"
  ON public.transporters FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- UPDATE policy
CREATE POLICY "Users can update their own tenant transporters"
  ON public.transporters FOR UPDATE
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

-- DELETE policy
CREATE POLICY "Users can delete their own tenant transporters"
  ON public.transporters FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- ============================================
-- ORDER_TEMPLATES TABLE RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own tenant templates" ON public.order_templates;
DROP POLICY IF EXISTS "Users can view their own tenant templates" ON public.order_templates;
DROP POLICY IF EXISTS "Users can update their own tenant templates" ON public.order_templates;
DROP POLICY IF EXISTS "Users can delete their own tenant templates" ON public.order_templates;

-- SELECT policy
CREATE POLICY "Users can view their own tenant templates"
  ON public.order_templates FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
    OR is_public = true  -- Allow viewing public templates
  );

-- INSERT policy
CREATE POLICY "Users can insert their own tenant templates"
  ON public.order_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- UPDATE policy
CREATE POLICY "Users can update their own tenant templates"
  ON public.order_templates FOR UPDATE
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

-- DELETE policy
CREATE POLICY "Users can delete their own tenant templates"
  ON public.order_templates FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- ============================================
-- ENHANCED_GEOFENCES TABLE RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own tenant geofences" ON public.enhanced_geofences;
DROP POLICY IF EXISTS "Users can view their own tenant geofences" ON public.enhanced_geofences;
DROP POLICY IF EXISTS "Users can update their own tenant geofences" ON public.enhanced_geofences;
DROP POLICY IF EXISTS "Users can delete their own tenant geofences" ON public.enhanced_geofences;

-- SELECT policy
CREATE POLICY "Users can view their own tenant geofences"
  ON public.enhanced_geofences FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- INSERT policy
CREATE POLICY "Users can insert their own tenant geofences"
  ON public.enhanced_geofences FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- UPDATE policy
CREATE POLICY "Users can update their own tenant geofences"
  ON public.enhanced_geofences FOR UPDATE
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

-- DELETE policy
CREATE POLICY "Users can delete their own tenant geofences"
  ON public.enhanced_geofences FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify all policies were created
SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('contacts', 'transporters', 'order_templates', 'enhanced_geofences')
ORDER BY tablename, cmd;

-- Expected output: 4 policies per table (SELECT, INSERT, UPDATE, DELETE)
-- Total: 16 policies

-- Test current user has access
SELECT 
  'Current User' as info_type,
  auth.uid() as user_id,
  u.email,
  u.tenant_id,
  u.role,
  u.is_active
FROM public.users u
WHERE u.id = auth.uid();

-- Test tenant exists
SELECT 
  'Current Tenant' as info_type,
  t.id as tenant_id,
  t.name as tenant_name,
  t.is_active
FROM public.tenants t
WHERE t.id IN (
  SELECT tenant_id FROM public.users WHERE id = auth.uid()
);

RAISE NOTICE 'RLS policies successfully created and verified!';
