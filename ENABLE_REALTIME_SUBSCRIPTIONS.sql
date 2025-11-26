-- ENABLE REALTIME SUBSCRIPTIONS FOR TRACKING PAGE
-- This fixes the CHANNEL_ERROR issues

-- Step 1: Enable realtime on driver_locations table
ALTER PUBLICATION supabase_realtime ADD TABLE driver_locations;

-- Step 2: Enable realtime on orders table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Step 3: Verify realtime is enabled
SELECT 
    schemaname,
    tablename,
    (SELECT COUNT(*) 
     FROM pg_publication_tables 
     WHERE schemaname = 'public' 
     AND tablename = pt.tablename 
     AND pubname = 'supabase_realtime') > 0 as realtime_enabled
FROM pg_tables pt
WHERE schemaname = 'public'
AND tablename IN ('driver_locations', 'orders')
ORDER BY tablename;

-- Step 4: Check RLS policies that affect SELECT (needed for subscriptions)
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
WHERE schemaname = 'public'
AND tablename IN ('driver_locations', 'orders')
AND cmd IN ('ALL', 'SELECT')
ORDER BY tablename, policyname;

-- IMPORTANT: After running this, you need to:
-- 1. Clear browser cache (Ctrl+Shift+R)
-- 2. Restart the Next.js dev server
-- 3. Check browser console for "Location subscription status: SUBSCRIBED"
