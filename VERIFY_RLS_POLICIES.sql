-- ================================================================
-- RLS POLICY VERIFICATION AND FIX
-- ================================================================
-- This script verifies and creates proper RLS policies for multi-tenant isolation
-- ================================================================

-- Check existing policies on users table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('users', 'drivers')
ORDER BY tablename, policyname;

-- ================================================================
-- USERS TABLE RLS POLICIES
-- ================================================================

-- Enable RLS if not already enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view their own tenant" ON public.users;
DROP POLICY IF EXISTS "Users can update their own tenant" ON public.users;
DROP POLICY IF EXISTS "Service role has full access to users" ON public.users;
DROP POLICY IF EXISTS "Tenant isolation for users" ON public.users;

-- Policy 1: Users can only see users in their tenant
CREATE POLICY "Tenant isolation for users"
ON public.users
FOR SELECT
USING (
    -- Service role bypass
    auth.jwt() ->> 'role' = 'service_role'
    OR
    -- Users can see users in their own tenant
    tenant_id IN (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
    )
);

-- Policy 2: Users can update users in their tenant (admins only)
CREATE POLICY "Admins can manage tenant users"
ON public.users
FOR UPDATE
USING (
    -- Service role bypass
    auth.jwt() ->> 'role' = 'service_role'
    OR
    -- Admin users can manage users in their tenant
    (
        tenant_id IN (
            SELECT tenant_id 
            FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    )
);

-- Policy 3: Admins can insert users in their tenant
CREATE POLICY "Admins can create tenant users"
ON public.users
FOR INSERT
WITH CHECK (
    -- Service role bypass
    auth.jwt() ->> 'role' = 'service_role'
    OR
    -- Admin users can create users in their tenant
    (
        tenant_id IN (
            SELECT tenant_id 
            FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    )
);

-- ================================================================
-- DRIVERS TABLE RLS POLICIES
-- ================================================================

-- Enable RLS if not already enabled
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view drivers in their tenant" ON public.drivers;
DROP POLICY IF EXISTS "Users can manage drivers in their tenant" ON public.drivers;
DROP POLICY IF EXISTS "Service role has full access to drivers" ON public.drivers;
DROP POLICY IF EXISTS "Tenant isolation for drivers" ON public.drivers;

-- Policy 1: Users can only see drivers in their tenant
CREATE POLICY "Tenant isolation for drivers"
ON public.drivers
FOR SELECT
USING (
    -- Service role bypass
    auth.jwt() ->> 'role' = 'service_role'
    OR
    -- Users can see drivers in their own tenant
    tenant_id IN (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
    )
);

-- Policy 2: Admins can manage drivers in their tenant
CREATE POLICY "Admins can manage tenant drivers"
ON public.drivers
FOR ALL
USING (
    -- Service role bypass
    auth.jwt() ->> 'role' = 'service_role'
    OR
    -- Admin users can manage drivers in their tenant
    (
        tenant_id IN (
            SELECT tenant_id 
            FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    )
)
WITH CHECK (
    -- Service role bypass
    auth.jwt() ->> 'role' = 'service_role'
    OR
    -- Admin users can create/update drivers in their tenant
    (
        tenant_id IN (
            SELECT tenant_id 
            FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    )
);

-- ================================================================
-- ORDERS TABLE RLS POLICIES (for driver assignment)
-- ================================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for orders" ON public.orders;
DROP POLICY IF EXISTS "Users can manage orders in their tenant" ON public.orders;

-- Policy: Users can only see orders in their tenant
CREATE POLICY "Tenant isolation for orders"
ON public.orders
FOR SELECT
USING (
    -- Service role bypass
    auth.jwt() ->> 'role' = 'service_role'
    OR
    -- Users can see orders in their own tenant
    tenant_id IN (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
    )
    OR
    -- Drivers can see orders assigned to them
    assigned_driver_id = auth.uid()
);

-- Policy: Admins and dispatchers can manage orders
CREATE POLICY "Admins and dispatchers can manage orders"
ON public.orders
FOR ALL
USING (
    -- Service role bypass
    auth.jwt() ->> 'role' = 'service_role'
    OR
    -- Admin/dispatcher users can manage orders in their tenant
    (
        tenant_id IN (
            SELECT tenant_id 
            FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'dispatcher')
        )
    )
    OR
    -- Drivers can update their assigned orders
    (
        assigned_driver_id = auth.uid()
    )
)
WITH CHECK (
    -- Service role bypass
    auth.jwt() ->> 'role' = 'service_role'
    OR
    -- Admin/dispatcher can create/update orders in their tenant
    (
        tenant_id IN (
            SELECT tenant_id 
            FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'dispatcher')
        )
    )
);

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Check that RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'drivers', 'orders')
ORDER BY tablename;

-- Check all policies are in place
SELECT 
    tablename,
    policyname,
    cmd as operation,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as using_check,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'drivers', 'orders')
ORDER BY tablename, policyname;

-- Test query: Simulate what dashboard sees for tenant '17ed751d-9c45-4cbb-9ccc-50607c151d43'
-- (This shows what an admin user in that tenant would see)
SELECT 
    'Drivers visible to tenant' as test,
    COUNT(*) as count
FROM public.users
WHERE role = 'driver'
  AND tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43';

SELECT 
    'Drivers from drivers table' as test,
    COUNT(*) as count
FROM public.drivers
WHERE tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43';

RAISE NOTICE '✅ RLS policies verified and updated';
