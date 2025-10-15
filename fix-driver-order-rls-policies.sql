-- Enhanced RLS policies for driver app order updates
-- This allows drivers to self-assign and update orders

-- First, check current policies
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
WHERE tablename = 'orders' 
AND schemaname = 'public'
ORDER BY cmd, policyname;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Drivers can update assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Drivers can view assigned orders" ON public.orders;

-- Create new enhanced policy for drivers to view orders
CREATE POLICY "Drivers can view assigned orders" ON public.orders
    FOR SELECT
    USING (
        -- Drivers can see orders assigned to them
        assigned_driver_id = auth.uid()
        OR driver_id = auth.uid()
        OR
        -- Drivers can see pending/available orders in their tenant
        (
            status IN ('pending', 'assigned') 
            AND EXISTS (
                SELECT 1 FROM public.users
                WHERE users.id = auth.uid()
                AND users.role = 'driver'
                AND users.tenant_id = orders.tenant_id
            )
        )
        OR
        -- Admins can see all orders in their tenant
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'dispatcher', 'manager')
            AND users.tenant_id = orders.tenant_id
        )
    );

-- Create new enhanced policy for drivers to update orders
CREATE POLICY "Drivers can update assigned orders" ON public.orders
    FOR UPDATE
    USING (
        -- Drivers can update orders assigned to them
        assigned_driver_id = auth.uid()
        OR driver_id = auth.uid()
        OR
        -- Drivers can self-assign to pending/unassigned orders
        (
            (assigned_driver_id IS NULL OR status = 'pending')
            AND EXISTS (
                SELECT 1 FROM public.users
                WHERE users.id = auth.uid()
                AND users.role = 'driver'
                AND users.is_active = true
                AND users.tenant_id = orders.tenant_id
            )
        )
        OR
        -- Admins can update all orders in their tenant
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'dispatcher', 'manager')
            AND users.tenant_id = orders.tenant_id
        )
    )
    WITH CHECK (
        -- After update, ensure driver is assigned
        (
            assigned_driver_id = auth.uid()
            OR driver_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.users
                WHERE users.id = auth.uid()
                AND users.role IN ('admin', 'dispatcher', 'manager')
            )
        )
    );

-- Verify the new policies
SELECT 'New policies created successfully' as status;

SELECT 
    policyname,
    cmd,
    SUBSTRING(qual, 1, 100) as using_clause_preview,
    SUBSTRING(with_check, 1, 100) as with_check_preview
FROM pg_policies 
WHERE tablename = 'orders' 
AND schemaname = 'public'
AND policyname LIKE '%Driver%'
ORDER BY cmd, policyname;

-- Test: Check what the driver can see and update
SELECT 
    'Testing driver access...' as test_info;

-- This query simulates what a driver with ID '5e5ebf46-d35f-4dc4-9025-28fdf81059fd' can see
-- (Run this from the Supabase dashboard SQL editor to verify)
COMMENT ON POLICY "Drivers can update assigned orders" ON public.orders IS 
'Allows drivers to: 1) Update orders assigned to them, 2) Self-assign to pending/unassigned orders in their tenant, 3) Admins can update any order in their tenant';

COMMENT ON POLICY "Drivers can view assigned orders" ON public.orders IS 
'Allows drivers to: 1) View orders assigned to them, 2) View pending/available orders in their tenant for self-assignment, 3) Admins can view all orders in their tenant';
