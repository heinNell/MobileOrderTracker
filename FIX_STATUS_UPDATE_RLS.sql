-- ========================================
-- FIX STATUS UPDATE RLS POLICIES
-- ========================================
-- This script fixes RLS policies to allow drivers to update order statuses

-- Enable RLS on status_updates table if not already enabled
ALTER TABLE status_updates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them)
DO $$ 
BEGIN
    -- Drop driver insert policy
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'status_updates' 
        AND policyname = 'Drivers can insert their own status updates'
    ) THEN
        DROP POLICY "Drivers can insert their own status updates" ON status_updates;
    END IF;

    -- Drop driver select policy
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'status_updates' 
        AND policyname = 'Drivers can view their own status updates'
    ) THEN
        DROP POLICY "Drivers can view their own status updates" ON status_updates;
    END IF;

    -- Drop admin select policy
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'status_updates' 
        AND policyname = 'Admins can view all status updates'
    ) THEN
        DROP POLICY "Admins can view all status updates" ON status_updates;
    END IF;
END $$;

-- Create policy for drivers to INSERT their own status updates
CREATE POLICY "Drivers can insert their own status updates"
ON status_updates
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = driver_id
);

-- Create policy for drivers to SELECT their own status updates
CREATE POLICY "Drivers can view their own status updates"
ON status_updates
FOR SELECT
TO authenticated
USING (
    auth.uid() = driver_id
);

-- Create policy for admins/dashboard to view all status updates
CREATE POLICY "Admins can view all status updates"
ON status_updates
FOR SELECT
TO authenticated
USING (true);

-- ========================================
-- FIX ORDERS TABLE RLS FOR STATUS UPDATES
-- ========================================

-- Enable RLS on orders table if not already enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop and recreate driver update policy
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' 
        AND policyname = 'Drivers can update their assigned orders'
    ) THEN
        DROP POLICY "Drivers can update their assigned orders" ON orders;
    END IF;
END $$;

-- Create policy for drivers to UPDATE their assigned orders
CREATE POLICY "Drivers can update their assigned orders"
ON orders
FOR UPDATE
TO authenticated
USING (
    auth.uid() = assigned_driver_id
)
WITH CHECK (
    auth.uid() = assigned_driver_id
);

-- ========================================
-- FIX ORDER_STATUS_HISTORY TABLE RLS
-- ========================================

-- Enable RLS on order_status_history if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'order_status_history') THEN
        ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        IF EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'order_status_history' 
            AND policyname = 'Drivers can insert status history for their orders'
        ) THEN
            DROP POLICY "Drivers can insert status history for their orders" ON order_status_history;
        END IF;

        IF EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'order_status_history' 
            AND policyname = 'Anyone can view status history'
        ) THEN
            DROP POLICY "Anyone can view status history" ON order_status_history;
        END IF;

        -- Create policies
        CREATE POLICY "Drivers can insert status history for their orders"
        ON order_status_history
        FOR INSERT
        TO authenticated
        WITH CHECK (true);

        CREATE POLICY "Anyone can view status history"
        ON order_status_history
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;

-- Verify policies were created
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename IN ('status_updates', 'orders', 'order_status_history')
ORDER BY tablename, policyname;

COMMENT ON POLICY "Drivers can update their assigned orders" ON orders IS 
'Allows drivers to update status and other fields on their assigned orders';

COMMENT ON POLICY "Drivers can insert their own status updates" ON status_updates IS 
'Allows drivers to create status update records for tracking';
