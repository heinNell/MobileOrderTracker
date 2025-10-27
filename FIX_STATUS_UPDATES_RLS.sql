-- =====================================================
-- FIX status_updates TABLE - RLS POLICIES
-- Based on actual schema analysis
-- =====================================================

-- STEP 1: Check current table schema
-- =====================================================
SELECT '=== ACTUAL SCHEMA OF status_updates ===' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'status_updates'
ORDER BY ordinal_position;

-- STEP 2: Check existing RLS policies
-- =====================================================
SELECT '=== CURRENT RLS POLICIES ===' as info;

SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'status_updates';

-- STEP 3: Enable RLS if not already enabled
-- =====================================================
ALTER TABLE public.status_updates ENABLE ROW LEVEL SECURITY;

-- STEP 4: Drop any existing policies (clean slate)
-- =====================================================
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'status_updates'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.status_updates', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- STEP 5: Create new RLS policies matching actual schema
-- =====================================================

-- Allow drivers to insert status updates for their assigned orders
CREATE POLICY "Drivers can insert status updates for assigned orders"
    ON public.status_updates
    FOR INSERT
    WITH CHECK (
        -- Driver must be authenticated
        auth.uid() IS NOT NULL
        AND (
            -- Either driver_id matches current user
            auth.uid() = driver_id
            OR
            -- Or user is assigned as driver to this order
            auth.uid() IN (
                SELECT assigned_driver_id 
                FROM public.orders 
                WHERE id = order_id
                AND assigned_driver_id IS NOT NULL
            )
        )
    );

-- Allow users in same tenant to view status updates
CREATE POLICY "Users can view status updates in their tenant"
    ON public.status_updates
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM public.orders o
            INNER JOIN public.users u ON u.id = auth.uid()
            WHERE o.id = status_updates.order_id
            AND o.tenant_id = u.tenant_id
        )
    );

-- Allow admins and dispatchers to insert/update any status
CREATE POLICY "Admins and dispatchers can manage all status updates"
    ON public.status_updates
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'dispatcher')
        )
    );

-- STEP 6: Verify realtime is enabled
-- =====================================================
DO $$
BEGIN
    -- Check if already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'status_updates'
    ) THEN
        -- Add to realtime publication
        ALTER PUBLICATION supabase_realtime ADD TABLE public.status_updates;
        RAISE NOTICE '✅ Added status_updates to realtime publication';
    ELSE
        RAISE NOTICE '✅ status_updates already in realtime publication';
    END IF;
END $$;

-- STEP 7: Create indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_status_updates_order_id 
    ON public.status_updates(order_id);

CREATE INDEX IF NOT EXISTS idx_status_updates_driver_id 
    ON public.status_updates(driver_id);

CREATE INDEX IF NOT EXISTS idx_status_updates_updated_at 
    ON public.status_updates(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_status_updates_created_at 
    ON public.status_updates(created_at DESC);

-- STEP 8: Test INSERT permission
-- =====================================================
SELECT '=== TESTING INSERT PERMISSION ===' as info;

DO $$
DECLARE
    test_order_id UUID := '5b2b87ac-8dd7-4339-b28d-df2ec0b985cc';
    test_driver_id UUID := '1e8658c9-12f1-4e86-be55-b0b1219b7eba';
BEGIN
    BEGIN
        -- Try to insert a test record
        INSERT INTO public.status_updates (
            order_id,
            driver_id,
            user_id,
            status,
            notes
        ) VALUES (
            test_order_id,
            test_driver_id,
            test_driver_id,
            'in_progress',
            'TEST INSERT - WILL BE DELETED'
        );
        
        RAISE NOTICE '✅ Successfully inserted test record';
        
        -- Clean up
        DELETE FROM public.status_updates 
        WHERE notes = 'TEST INSERT - WILL BE DELETED';
        
        RAISE NOTICE '✅ Cleaned up test record';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ INSERT failed: %', SQLERRM;
    END;
END $$;

-- STEP 9: Verify final state
-- =====================================================
SELECT '=== FINAL VERIFICATION ===' as info;

SELECT 
    'RLS Enabled' as check_item,
    CASE WHEN relrowsecurity THEN '✅ YES' ELSE '❌ NO' END as status
FROM pg_class
WHERE relname = 'status_updates';

SELECT 
    'Policy Count' as check_item,
    COUNT(*)::text || ' policies' as status
FROM pg_policies 
WHERE tablename = 'status_updates';

SELECT 
    'Realtime Enabled' as check_item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
            AND tablename = 'status_updates'
        ) THEN '✅ YES' 
        ELSE '❌ NO' 
    END as status;

-- STEP 10: Show all policies
-- =====================================================
SELECT '=== ALL POLICIES ON status_updates ===' as info;

SELECT 
    policyname,
    cmd,
    CASE 
        WHEN cmd = 'INSERT' THEN 'Allow INSERT'
        WHEN cmd = 'SELECT' THEN 'Allow SELECT'
        WHEN cmd = 'ALL' THEN 'Allow ALL operations'
        ELSE cmd::text
    END as description
FROM pg_policies 
WHERE tablename = 'status_updates'
ORDER BY cmd;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '✅ status_updates TABLE FIX COMPLETE';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test status update from mobile app';
    RAISE NOTICE '2. Check dashboard for status timeline';
    RAISE NOTICE '3. Verify real-time updates work';
    RAISE NOTICE '';
END $$;
