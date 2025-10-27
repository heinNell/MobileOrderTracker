-- =====================================================
-- FIX STATUS UPDATES - SCHEMA MISMATCH
-- =====================================================
-- The status_updates table has different columns than expected
-- Actual columns: id, user_id, status, created_at, order_id, driver_id, notes, updated_at
-- Expected: old_status, new_status, updated_by

-- OPTION 1: Add RLS Policies for Current Schema
-- =====================================================

-- Enable RLS if not already enabled
ALTER TABLE public.status_updates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Drivers can insert status updates" ON public.status_updates;
DROP POLICY IF EXISTS "Users can view status updates in their tenant" ON public.status_updates;

-- Allow drivers to insert their own status updates
CREATE POLICY "Drivers can insert their status updates"
    ON public.status_updates
    FOR INSERT
    WITH CHECK (
        auth.uid() = driver_id OR 
        auth.uid() = user_id OR
        auth.uid() IN (
            SELECT assigned_driver_id 
            FROM public.orders 
            WHERE id = order_id
        )
    );

-- Allow users in same tenant to view status updates
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

-- OPTION 2: Add Missing Columns (Better for compatibility)
-- =====================================================

-- Add old_status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'status_updates' 
        AND column_name = 'old_status'
    ) THEN
        ALTER TABLE public.status_updates 
        ADD COLUMN old_status order_status;
        RAISE NOTICE '✅ Added old_status column';
    END IF;
END $$;

-- Add new_status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'status_updates' 
        AND column_name = 'new_status'
    ) THEN
        ALTER TABLE public.status_updates 
        ADD COLUMN new_status order_status;
        RAISE NOTICE '✅ Added new_status column';
    END IF;
END $$;

-- Add updated_by column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'status_updates' 
        AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE public.status_updates 
        ADD COLUMN updated_by UUID REFERENCES auth.users(id);
        RAISE NOTICE '✅ Added updated_by column';
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_status_updates_old_status ON public.status_updates(old_status);
CREATE INDEX IF NOT EXISTS idx_status_updates_new_status ON public.status_updates(new_status);
CREATE INDEX IF NOT EXISTS idx_status_updates_updated_by ON public.status_updates(updated_by);

-- Verify realtime is enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'status_updates'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.status_updates;
        RAISE NOTICE '✅ Enabled realtime for status_updates';
    ELSE
        RAISE NOTICE '✅ Realtime already enabled for status_updates';
    END IF;
END $$;

-- Test the policies
-- =====================================================
SELECT '=== TESTING STATUS UPDATES ===' as section;

-- Test insert with current schema
DO $$
DECLARE
    test_order_id UUID := '5b2b87ac-8dd7-4339-b28d-df2ec0b985cc';
    test_driver_id UUID := '1e8658c9-12f1-4e86-be55-b0b1219b7eba';
BEGIN
    -- Try to insert a test record
    INSERT INTO public.status_updates (
        order_id,
        driver_id,
        user_id,
        status,
        old_status,
        new_status,
        updated_by,
        notes
    ) VALUES (
        test_order_id,
        test_driver_id,
        test_driver_id,
        'loading',
        'arrived_at_loading_point',
        'loading',
        test_driver_id,
        'TEST - DELETE ME'
    );
    
    RAISE NOTICE '✅ Successfully inserted test status update';
    
    -- Clean up
    DELETE FROM public.status_updates WHERE notes = 'TEST - DELETE ME';
    RAISE NOTICE '✅ Cleaned up test record';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Failed to insert: %', SQLERRM;
END $$;

-- Verify schema
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'status_updates'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verify RLS policies
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'status_updates';

RAISE NOTICE '=== FIX COMPLETE ===';
RAISE NOTICE 'Next step: Update mobile app StatusUpdateService to use correct column names';
