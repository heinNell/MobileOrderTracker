-- =====================================================
-- MOBILE APP ↔ DASHBOARD INTEGRATION FIX
-- Run this in Supabase SQL Editor
-- =====================================================

-- STEP 1: Verify Tables Exist
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '=== CHECKING DATABASE TABLES ===';
    
    -- Check if tables exist
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'status_updates') THEN
        RAISE NOTICE '✅ status_updates table exists';
    ELSE
        RAISE NOTICE '❌ status_updates table MISSING - needs to be created!';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'driver_locations') THEN
        RAISE NOTICE '✅ driver_locations table exists';
    ELSE
        RAISE NOTICE '❌ driver_locations table MISSING - needs to be created!';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_status_history') THEN
        RAISE NOTICE '✅ order_status_history table exists';
    ELSE
        RAISE NOTICE '⚠️  order_status_history table missing (optional)';
    END IF;
END $$;

-- STEP 2: Check Current Driver Status
-- =====================================================
SELECT '=== DRIVER INFORMATION ===' as section;

SELECT 
    id,
    email,
    full_name,
    role,
    tenant_id,
    is_active,
    created_at
FROM users 
WHERE email = 'roelof@hfr1.gmail.com';

-- STEP 3: Check Driver's Orders
-- =====================================================
SELECT '=== DRIVER ORDERS ===' as section;

SELECT 
    id,
    order_number,
    status,
    assigned_driver_id,
    created_at,
    updated_at
FROM orders 
WHERE assigned_driver_id = '1e8658c9-12f1-4e86-be55-b0b1219b7eba'
ORDER BY created_at DESC
LIMIT 5;

-- STEP 4: Check Recent Status Updates
-- =====================================================
SELECT '=== RECENT STATUS UPDATES ===' as section;

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'status_updates') THEN
        RAISE NOTICE 'Checking status_updates table...';
        PERFORM * FROM status_updates 
        WHERE order_id = '5b2b87ac-8dd7-4339-b28d-df2ec0b985cc'
        ORDER BY updated_at DESC
        LIMIT 10;
    ELSE
        RAISE NOTICE 'status_updates table does not exist!';
    END IF;
END $$;

-- Run if table exists
SELECT 
    id,
    order_id,
    old_status,
    new_status,
    updated_by,
    updated_at,
    notes
FROM status_updates 
WHERE order_id = '5b2b87ac-8dd7-4339-b28d-df2ec0b985cc'
ORDER BY updated_at DESC
LIMIT 10;

-- STEP 5: Check Recent Location Updates
-- =====================================================
SELECT '=== RECENT LOCATION UPDATES ===' as section;

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'driver_locations') THEN
        RAISE NOTICE 'Checking driver_locations table...';
    ELSE
        RAISE NOTICE 'driver_locations table does not exist!';
    END IF;
END $$;

-- Run if table exists
SELECT 
    id,
    order_id,
    driver_id,
    latitude,
    longitude,
    accuracy_meters,
    created_at,
    timestamp
FROM driver_locations 
WHERE order_id = '5b2b87ac-8dd7-4339-b28d-df2ec0b985cc'
ORDER BY created_at DESC
LIMIT 10;

-- STEP 6: Check RLS Policies
-- =====================================================
SELECT '=== RLS POLICIES ===' as section;

SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('status_updates', 'driver_locations', 'orders')
ORDER BY tablename, cmd;

-- STEP 7: Test Driver Permissions
-- =====================================================
SELECT '=== TESTING DRIVER INSERT PERMISSIONS ===' as section;

-- This will show if current user can insert
DO $$
DECLARE
    test_order_id UUID := '5b2b87ac-8dd7-4339-b28d-df2ec0b985cc';
    test_driver_id UUID := '1e8658c9-12f1-4e86-be55-b0b1219b7eba';
BEGIN
    -- Test status_updates insert
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'status_updates') THEN
        BEGIN
            INSERT INTO status_updates (order_id, old_status, new_status, updated_by, notes, updated_at)
            VALUES (test_order_id, 'activated', 'in_progress', test_driver_id, 'TEST INSERT - DELETE ME', NOW());
            
            RAISE NOTICE '✅ Can INSERT into status_updates';
            
            -- Clean up test record
            DELETE FROM status_updates WHERE notes = 'TEST INSERT - DELETE ME';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Cannot INSERT into status_updates: %', SQLERRM;
        END;
    END IF;
    
    -- Test driver_locations insert
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'driver_locations') THEN
        BEGIN
            INSERT INTO driver_locations (order_id, driver_id, latitude, longitude, accuracy_meters, timestamp)
            VALUES (test_order_id, test_driver_id, -25.7479, 28.2293, 10, NOW());
            
            RAISE NOTICE '✅ Can INSERT into driver_locations';
            
            -- Clean up test record
            DELETE FROM driver_locations 
            WHERE order_id = test_order_id 
            AND latitude = -25.7479 
            AND longitude = 28.2293
            AND created_at > NOW() - INTERVAL '5 seconds';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Cannot INSERT into driver_locations: %', SQLERRM;
        END;
    END IF;
END $$;

-- STEP 8: Check Functions Exist
-- =====================================================
SELECT '=== DATABASE FUNCTIONS ===' as section;

SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname IN ('update_order_status', 'get_tracking_data', 'get_order_status_history')
AND pronamespace = 'public'::regnamespace;

-- STEP 9: Test get_tracking_data Function
-- =====================================================
SELECT '=== TESTING get_tracking_data FUNCTION ===' as section;

SELECT * FROM get_tracking_data('5b2b87ac-8dd7-4339-b28d-df2ec0b985cc');

-- STEP 10: Check Real-time Subscriptions
-- =====================================================
SELECT '=== REALTIME PUBLICATION ===' as section;

SELECT 
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('orders', 'status_updates', 'driver_locations', 'order_status_history');

-- =====================================================
-- FIXES TO APPLY IF NEEDED
-- =====================================================

-- FIX 1: Create status_updates table if missing
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'status_updates') THEN
        CREATE TABLE public.status_updates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
            old_status order_status,
            new_status order_status NOT NULL,
            updated_by UUID REFERENCES auth.users(id),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            notes TEXT,
            location JSONB,
            metadata JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create index for faster queries
        CREATE INDEX idx_status_updates_order_id ON public.status_updates(order_id);
        CREATE INDEX idx_status_updates_updated_at ON public.status_updates(updated_at DESC);
        
        -- Enable RLS
        ALTER TABLE public.status_updates ENABLE ROW LEVEL SECURITY;
        
        -- Allow drivers to insert their own updates
        CREATE POLICY "Drivers can insert status updates"
            ON public.status_updates
            FOR INSERT
            WITH CHECK (auth.uid() = updated_by);
        
        -- Allow everyone in same tenant to read
        CREATE POLICY "Users can view status updates in their tenant"
            ON public.status_updates
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.orders o
                    INNER JOIN public.users u ON u.tenant_id = (
                        SELECT tenant_id FROM public.users WHERE id = auth.uid()
                    )
                    WHERE o.id = status_updates.order_id
                    AND o.tenant_id = u.tenant_id
                )
            );
        
        -- Enable realtime
        ALTER PUBLICATION supabase_realtime ADD TABLE public.status_updates;
        
        RAISE NOTICE '✅ Created status_updates table with RLS policies';
    END IF;
END $$;

-- FIX 2: Create driver_locations table if missing
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'driver_locations') THEN
        CREATE TABLE public.driver_locations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
            driver_id UUID NOT NULL REFERENCES auth.users(id),
            latitude NUMERIC(10, 8) NOT NULL,
            longitude NUMERIC(11, 8) NOT NULL,
            accuracy_meters NUMERIC(10, 2),
            speed NUMERIC(10, 2),
            heading NUMERIC(5, 2),
            timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX idx_driver_locations_order_id ON public.driver_locations(order_id);
        CREATE INDEX idx_driver_locations_driver_id ON public.driver_locations(driver_id);
        CREATE INDEX idx_driver_locations_created_at ON public.driver_locations(created_at DESC);
        CREATE INDEX idx_driver_locations_timestamp ON public.driver_locations(timestamp DESC);
        
        -- Enable RLS
        ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
        
        -- Allow drivers to insert their own locations
        CREATE POLICY "Drivers can insert their locations"
            ON public.driver_locations
            FOR INSERT
            WITH CHECK (auth.uid() = driver_id);
        
        -- Allow everyone in same tenant to read
        CREATE POLICY "Users can view driver locations in their tenant"
            ON public.driver_locations
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.orders o
                    INNER JOIN public.users u ON u.tenant_id = (
                        SELECT tenant_id FROM public.users WHERE id = auth.uid()
                    )
                    WHERE o.id = driver_locations.order_id
                    AND o.tenant_id = u.tenant_id
                )
            );
        
        -- Enable realtime
        ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
        
        RAISE NOTICE '✅ Created driver_locations table with RLS policies';
    END IF;
END $$;

-- FIX 3: Enable realtime for orders table
-- =====================================================
DO $$
BEGIN
    -- Check if orders is in realtime publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
        RAISE NOTICE '✅ Enabled realtime for orders table';
    ELSE
        RAISE NOTICE '✅ Realtime already enabled for orders table';
    END IF;
END $$;

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================
SELECT '=== FINAL VERIFICATION ===' as section;

SELECT 
    'Tables' as check_type,
    COUNT(*) as count
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('status_updates', 'driver_locations', 'orders')

UNION ALL

SELECT 
    'RLS Policies' as check_type,
    COUNT(*) as count
FROM pg_policies 
WHERE tablename IN ('status_updates', 'driver_locations', 'orders')

UNION ALL

SELECT 
    'Realtime Tables' as check_type,
    COUNT(*) as count
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('orders', 'status_updates', 'driver_locations');

-- Final summary messages
DO $$
BEGIN
    RAISE NOTICE '=== DIAGNOSTIC COMPLETE ===';
    RAISE NOTICE 'Review the output above to identify any missing tables or policies';
    RAISE NOTICE 'If tables were created, test status updates from mobile app';
END $$;
