-- =====================================================
-- FIX DRIVER_LOCATIONS RLS POLICY
-- Critical: Drivers cannot insert location updates
-- =====================================================

-- Check current RLS policies
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'driver_locations'
ORDER BY cmd, policyname;

-- Check if RLS is enabled
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'driver_locations';

-- Fix: Ensure drivers can insert their own locations
-- Drop conflicting policies if they exist
DROP POLICY IF EXISTS "Drivers can insert own location" ON public.driver_locations;
DROP POLICY IF EXISTS "Drivers can insert own location updates" ON public.driver_locations;
DROP POLICY IF EXISTS "Drivers can insert their own locations" ON public.driver_locations;

-- Create a single, correct INSERT policy
CREATE POLICY "drivers_can_insert_own_locations"
    ON public.driver_locations
    FOR INSERT
    WITH CHECK (
        auth.uid() = driver_id
    );

-- Ensure drivers can also SELECT their own locations
DROP POLICY IF EXISTS "Drivers can view own locations" ON public.driver_locations;
DROP POLICY IF EXISTS "drivers_can_view_own_locations" ON public.driver_locations;

CREATE POLICY "drivers_can_view_own_locations"
    ON public.driver_locations
    FOR SELECT
    USING (
        auth.uid() = driver_id OR
        EXISTS (
            SELECT 1 FROM public.orders o
            INNER JOIN public.users u ON u.tenant_id = (
                SELECT tenant_id FROM public.users WHERE id = auth.uid()
            )
            WHERE o.id = driver_locations.order_id
            AND o.tenant_id = u.tenant_id
        )
    );

-- Verify RLS is enabled
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Test the policy (should succeed)
DO $$
DECLARE
    test_driver_id UUID;
    test_order_id UUID := '5b2b87ac-8dd7-4339-b28d-df2ec0b985cc';
BEGIN
    -- Get current authenticated user
    test_driver_id := auth.uid();
    
    IF test_driver_id IS NULL THEN
        RAISE NOTICE '⚠️ No authenticated user - cannot test policy';
        RAISE NOTICE 'Please run this query while logged in as a driver';
    ELSE
        -- Try to insert a test location
        INSERT INTO public.driver_locations (
            order_id,
            driver_id,
            latitude,
            longitude,
            accuracy_meters,
            timestamp
        ) VALUES (
            test_order_id,
            test_driver_id,
            -25.7479,
            28.2293,
            50,
            NOW()
        );
        
        RAISE NOTICE '✅ Successfully inserted test location';
        
        -- Clean up test record
        DELETE FROM public.driver_locations 
        WHERE driver_id = test_driver_id
        AND latitude = -25.7479
        AND longitude = 28.2293
        AND created_at > NOW() - INTERVAL '10 seconds';
        
        RAISE NOTICE '✅ Test completed successfully - RLS policy working';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Failed to insert: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;

-- Final verification
SELECT '=== RLS POLICIES FOR driver_locations ===' as info;

SELECT 
    policyname,
    cmd,
    CASE 
        WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check
        WHEN qual IS NOT NULL THEN 'USING: ' || qual
        ELSE 'No condition'
    END as policy_condition
FROM pg_policies
WHERE tablename = 'driver_locations'
ORDER BY cmd, policyname;
