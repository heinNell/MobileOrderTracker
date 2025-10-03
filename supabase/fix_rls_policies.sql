-- Fix for Infinite Recursion in RLS Policies
-- Run this in Supabase SQL Editor to replace the problematic policies

-- ========================================
-- DROP EXISTING POLICIES
-- ========================================

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users in tenant" ON users;

DROP POLICY IF EXISTS "Users can view orders in their tenant" ON orders;
DROP POLICY IF EXISTS "Drivers can view assigned orders" ON orders;
DROP POLICY IF EXISTS "Admins and dispatchers can insert orders" ON orders;
DROP POLICY IF EXISTS "Admins and dispatchers can update orders" ON orders;

-- ========================================
-- CREATE NEW SIMPLIFIED POLICIES
-- ========================================

-- USERS TABLE POLICIES (No recursion - only checks auth.uid())
CREATE POLICY "users_select_own" ON users
    FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
    FOR UPDATE 
    USING (auth.uid() = id);

-- Simple policy: Admins can see users in same tenant (direct tenant_id comparison)
CREATE POLICY "users_select_tenant_admin" ON users
    FOR SELECT 
    USING (
        users.tenant_id IN (
            SELECT u.tenant_id FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- ORDERS TABLE POLICIES (Simplified to avoid recursion)

-- Policy 1: View orders - Check tenant_id directly without subquery on users
CREATE POLICY "orders_select_tenant" ON orders
    FOR SELECT 
    USING (
        orders.tenant_id IN (
            SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()
        )
    );

-- Policy 2: Drivers can see their assigned orders
CREATE POLICY "orders_select_assigned_driver" ON orders
    FOR SELECT 
    USING (assigned_driver_id = auth.uid());

-- Policy 3: Insert orders - Only admin/dispatcher role
CREATE POLICY "orders_insert_admin_dispatcher" ON orders
    FOR INSERT 
    WITH CHECK (
        orders.tenant_id IN (
            SELECT u.tenant_id FROM users u
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin', 'dispatcher')
        )
    );

-- Policy 4: Update orders - Only admin/dispatcher in same tenant
CREATE POLICY "orders_update_admin_dispatcher" ON orders
    FOR UPDATE 
    USING (
        orders.tenant_id IN (
            SELECT u.tenant_id FROM users u
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin', 'dispatcher')
        )
    );

-- Policy 5: Drivers can update their assigned orders (status changes)
CREATE POLICY "orders_update_assigned_driver" ON orders
    FOR UPDATE 
    USING (assigned_driver_id = auth.uid())
    WITH CHECK (assigned_driver_id = auth.uid());

-- ========================================
-- VERIFY POLICIES
-- ========================================

-- Check that policies are created correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('users', 'orders')
ORDER BY tablename, policyname;
