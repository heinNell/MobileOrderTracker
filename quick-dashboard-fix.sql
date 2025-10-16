-- Quick Fix for Dashboard Driver Assignment Issue
-- Run this script to immediately resolve the driver name display problem

-- 1. Ensure status column exists with proper type
DO $$
BEGIN
    -- Add status column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'status'
    ) THEN
        -- Add the column with the enum type
        ALTER TABLE public.orders ADD COLUMN status order_status DEFAULT 'pending';
        RAISE NOTICE 'Added status column to orders table';
    END IF;
    
    -- Update any NULL status values
    UPDATE public.orders SET status = 'pending' WHERE status IS NULL;
    
    RAISE NOTICE 'Status column verified and fixed';
END
$$;

-- 2. Create the expected foreign key constraint name
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    -- Check if the specific constraint name exists
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'orders_assigned_driver_id_fkey'
    ) INTO constraint_exists;
    
    IF NOT constraint_exists THEN
        -- Check if assigned_driver_id has any foreign key constraint
        IF EXISTS (
            SELECT 1 FROM pg_constraint c
            JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
            WHERE c.conrelid = 'public.orders'::regclass
            AND c.contype = 'f'
            AND a.attname = 'assigned_driver_id'
        ) THEN
            -- Drop existing constraint with different name
            EXECUTE (
                SELECT 'ALTER TABLE public.orders DROP CONSTRAINT ' || c.conname
                FROM pg_constraint c
                JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
                WHERE c.conrelid = 'public.orders'::regclass
                AND c.contype = 'f'
                AND a.attname = 'assigned_driver_id'
                LIMIT 1
            );
        END IF;
        
        -- Create the constraint with the expected name
        ALTER TABLE public.orders 
        ADD CONSTRAINT orders_assigned_driver_id_fkey 
        FOREIGN KEY (assigned_driver_id) REFERENCES public.users(id);
        
        RAISE NOTICE 'Created foreign key constraint: orders_assigned_driver_id_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists with correct name';
    END IF;
END
$$;

-- 3. Test the dashboard query to ensure it works
SELECT 
    'Dashboard Query Test' as test_type,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN assigned_driver_id IS NOT NULL THEN 1 END) as orders_with_drivers,
    COUNT(CASE WHEN u.full_name IS NOT NULL THEN 1 END) as orders_with_driver_names
FROM public.orders o
LEFT JOIN public.users u ON o.assigned_driver_id = u.id
WHERE EXISTS (
    SELECT 1 FROM public.users auth_user 
    WHERE auth_user.id = auth.uid() 
    AND auth_user.tenant_id = o.tenant_id
);

-- 4. Refresh any materialized views or clear cache
-- This ensures fresh data is available
NOTIFY order_updates, 'driver_assignment_fixed';

-- 5. Verification query
SELECT 
    'Fix Verification' as status,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'status'
    ) THEN '✓ Status column exists' 
    ELSE '✗ Status column missing' END as status_check,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'orders_assigned_driver_id_fkey'
    ) THEN '✓ Foreign key constraint exists' 
    ELSE '✗ Foreign key constraint missing' END as fkey_check,
    
    (SELECT COUNT(*) FROM public.orders WHERE assigned_driver_id IS NOT NULL) as orders_with_drivers;