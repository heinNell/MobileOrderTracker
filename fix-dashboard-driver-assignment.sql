-- Fix for Dashboard Driver Assignment Display Issue
-- This script addresses the "column 'status' does not exist" and driver name disappearing issues

-- Step 1: Ensure the orders table has the correct structure
DO $$
BEGIN
    -- Check if status column exists, if not create it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN status order_status DEFAULT 'pending';
        RAISE NOTICE 'Added status column to orders table';
    END IF;
    
    -- Ensure assigned_driver_id column exists with proper foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'assigned_driver_id'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN assigned_driver_id UUID REFERENCES public.users(id);
        RAISE NOTICE 'Added assigned_driver_id column to orders table';
    END IF;
END
$$;

-- Step 2: Create/recreate the foreign key constraint with the expected name
DO $$
BEGIN
    -- Drop existing foreign key if it exists with a different name
    IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'orders' 
        AND c.contype = 'f'
        AND EXISTS (
            SELECT 1 FROM pg_attribute a 
            WHERE a.attrelid = c.conrelid 
            AND a.attnum = ANY(c.conkey) 
            AND a.attname = 'assigned_driver_id'
        )
    ) THEN
        -- Get the actual constraint name and drop it
        EXECUTE (
            SELECT 'ALTER TABLE public.orders DROP CONSTRAINT ' || c.conname
            FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
            WHERE t.relname = 'orders' 
            AND c.contype = 'f'
            AND a.attname = 'assigned_driver_id'
            LIMIT 1
        );
        RAISE NOTICE 'Dropped existing foreign key constraint';
    END IF;
    
    -- Create the foreign key with the expected name
    ALTER TABLE public.orders 
    ADD CONSTRAINT orders_assigned_driver_id_fkey 
    FOREIGN KEY (assigned_driver_id) REFERENCES public.users(id);
    
    RAISE NOTICE 'Created foreign key constraint: orders_assigned_driver_id_fkey';
END
$$;

-- Step 3: Create a view that makes driver joins easier and more reliable
CREATE OR REPLACE VIEW public.orders_with_drivers AS
SELECT 
    o.*,
    u.full_name as assigned_driver_name,
    u.email as assigned_driver_email,
    u.phone as assigned_driver_phone,
    u.role as assigned_driver_role,
    u.is_active as assigned_driver_active
FROM public.orders o
LEFT JOIN public.users u ON o.assigned_driver_id = u.id;

-- Step 4: Grant appropriate permissions on the view
GRANT SELECT ON public.orders_with_drivers TO authenticated;
GRANT SELECT ON public.orders_with_drivers TO anon;

-- Step 5: Create RLS policy for the view
ALTER TABLE public.orders_with_drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view orders from their tenant with drivers" ON public.orders_with_drivers
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Step 6: Update RLS policies on orders table to ensure proper access
DROP POLICY IF EXISTS "Users can view orders from their tenant" ON public.orders;
CREATE POLICY "Users can view orders from their tenant" ON public.orders
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update orders from their tenant" ON public.orders;
CREATE POLICY "Users can update orders from their tenant" ON public.orders
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert orders to their tenant" ON public.orders;
CREATE POLICY "Users can insert orders to their tenant" ON public.orders
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Step 7: Ensure users table has proper RLS
DROP POLICY IF EXISTS "Users can view other users in their tenant" ON public.users;
CREATE POLICY "Users can view other users in their tenant" ON public.users
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Step 8: Create indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_assigned_driver_id 
ON public.orders(assigned_driver_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tenant_id_status 
ON public.orders(tenant_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_updated_at 
ON public.orders(updated_at DESC);

-- Step 9: Verify the fix
SELECT 
    'Fix Verification' as check_type,
    'Foreign key constraint exists: ' || 
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'orders_assigned_driver_id_fkey'
    ) THEN 'YES' ELSE 'NO' END as fkey_status,
    'Status column exists: ' ||
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'status'
    ) THEN 'YES' ELSE 'NO' END as status_column_status,
    'Orders with drivers view exists: ' ||
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'orders_with_drivers'
    ) THEN 'YES' ELSE 'NO' END as view_status;