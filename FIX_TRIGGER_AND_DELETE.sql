-- Fix: Remove problematic trigger on orders table and add delete functionality
-- This fixes the "record 'new' has no field 'accuracy_meters'" error
-- Run this in Supabase SQL Editor

-- ============================================================================
-- 1. DROP OLD PROBLEMATIC TRIGGERS ON ORDERS TABLE
-- ============================================================================

-- Drop any old triggers that reference accuracy_meters on orders table
DROP TRIGGER IF EXISTS handle_order_updates_trigger ON public.orders;
DROP TRIGGER IF EXISTS sync_order_to_driver_locations ON public.orders;
DROP TRIGGER IF EXISTS update_driver_location_from_order ON public.orders;

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS public.sync_order_to_driver_locations();
DROP FUNCTION IF EXISTS public.update_driver_location_from_order();

-- The correct trigger should ONLY be on driver_locations table (not orders table)
-- Verify the correct trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
    AND event_object_table IN ('driver_locations', 'orders')
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- 2. FIX FOREIGN KEY CONSTRAINTS FOR CASCADE DELETE
-- ============================================================================

-- Fix location_updates foreign key to cascade delete
ALTER TABLE public.location_updates
DROP CONSTRAINT IF EXISTS location_updates_order_id_fkey;

ALTER TABLE public.location_updates
ADD CONSTRAINT location_updates_order_id_fkey
FOREIGN KEY (order_id)
REFERENCES public.orders(id)
ON DELETE CASCADE;

-- Fix driver_locations foreign key to cascade delete (if exists)
ALTER TABLE public.driver_locations
DROP CONSTRAINT IF EXISTS driver_locations_order_id_fkey;

-- Make order_id nullable if it isn't already
ALTER TABLE public.driver_locations
ALTER COLUMN order_id DROP NOT NULL;

-- Add foreign key with SET NULL on delete and NOT VALID for existing records
ALTER TABLE public.driver_locations
ADD CONSTRAINT driver_locations_order_id_fkey
FOREIGN KEY (order_id)
REFERENCES public.orders(id)
ON DELETE SET NULL
NOT VALID; -- Don't check existing records

-- Validate the constraint (clean up invalid order_ids first)
UPDATE public.driver_locations
SET order_id = NULL
WHERE order_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = driver_locations.order_id
  );

-- Now validate the constraint for future inserts
ALTER TABLE public.driver_locations
VALIDATE CONSTRAINT driver_locations_order_id_fkey;

-- Fix status_updates foreign key to cascade delete (if exists)
ALTER TABLE public.status_updates
DROP CONSTRAINT IF EXISTS status_updates_order_id_fkey;

ALTER TABLE public.status_updates
ADD CONSTRAINT status_updates_order_id_fkey
FOREIGN KEY (order_id)
REFERENCES public.orders(id)
ON DELETE CASCADE;

-- ============================================================================
-- 3. ENSURE ORDERS TABLE HAS PROPER RLS FOR DELETE
-- ============================================================================

-- Enable RLS on orders table if not already enabled
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing delete policies to avoid conflicts
DROP POLICY IF EXISTS "Admin can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Users can delete their tenant orders" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated users to delete orders" ON public.orders;
DROP POLICY IF EXISTS "Allow delete orders for admins and tenant users" ON public.orders;

-- Create delete policy for admins and users in same tenant
CREATE POLICY "Allow delete orders for admins and tenant users"
ON public.orders
FOR DELETE
TO authenticated
USING (
    -- Admin can delete any order
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
    OR
    -- User can delete orders from their tenant
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.tenant_id = orders.tenant_id
    )
    OR
    -- Driver can delete their own orders
    (
        assigned_driver_id = auth.uid()
    )
);

-- ============================================================================
-- 4. VERIFICATION QUERIES
-- ============================================================================

-- Show all foreign key constraints related to orders
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'orders'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Show all policies on orders table
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
ORDER BY policyname;

-- Show remaining triggers
SELECT 
    event_object_table as table_name,
    trigger_name,
    event_manipulation as event,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
    AND event_object_table IN ('orders', 'driver_locations')
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Trigger and foreign key fix complete:';
    RAISE NOTICE '   - Removed problematic triggers from orders table';
    RAISE NOTICE '   - Fixed foreign keys to allow CASCADE DELETE';
    RAISE NOTICE '   - location_updates: CASCADE (deletes with order)';
    RAISE NOTICE '   - status_updates: CASCADE (deletes with order)';
    RAISE NOTICE '   - driver_locations: SET NULL (keeps history, removes order reference)';
    RAISE NOTICE '   - Added delete policy for orders';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '   1. Refresh your dashboard';
    RAISE NOTICE '   2. Try assigning a driver to an order';
    RAISE NOTICE '   3. Try deleting an order (related records will be handled automatically)';
    RAISE NOTICE '   4. Verify location updates still work from mobile app';
END $$;
