#!/bin/bash

# Complete fix for orders_with_drivers missing column issue
# This script provides both database fixes and application fallbacks

echo "🔧 Fixing orders_with_drivers database schema issue..."

echo "📋 Step 1: Diagnosing current database state..."
echo "You can run this SQL in your Supabase SQL editor:"
echo ""
echo "-- === DIAGNOSTIC QUERY ==="
cat << 'EOF'
-- Check current state of database
SELECT 'Database Diagnostic Results' as info;

-- Check if orders table exists and has required columns
SELECT 
    'orders_table_columns' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'orders'
AND column_name IN ('id', 'status', 'assigned_driver_id', 'tenant_id')
ORDER BY column_name;

-- Check if users table has required columns
SELECT 
    'users_table_columns' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
AND column_name IN ('id', 'full_name', 'email', 'tenant_id')
ORDER BY column_name;

-- Check if orders_with_drivers view exists
SELECT 
    'view_status' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'orders_with_drivers'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;

-- If view exists, check its columns
SELECT 
    'view_columns' as check_type,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'orders_with_drivers'
ORDER BY ordinal_position;
EOF

echo ""
echo "-- === END DIAGNOSTIC ==="
echo ""

echo "📋 Step 2: Database Fix (run this in Supabase SQL editor):"
echo ""
echo "-- === DATABASE FIX ==="
cat << 'EOF'
-- Fix for missing orders_with_drivers.assigned_driver_email column

-- Step 1: Drop and recreate the view with all necessary columns
DROP VIEW IF EXISTS public.orders_with_drivers CASCADE;

-- Step 2: Create the complete view
CREATE VIEW public.orders_with_drivers AS
SELECT 
    o.id,
    o.order_number,
    o.status,
    o.assigned_driver_id,
    o.tenant_id,
    o.loading_point_name,
    o.loading_point_address,
    o.loading_point_location,
    o.unloading_point_name,
    o.unloading_point_address,
    o.unloading_point_location,
    o.delivery_instructions,
    o.contact_name,
    o.contact_phone,
    o.created_at,
    o.updated_at,
    o.qr_code_data,
    -- Driver information from users table
    u.full_name as assigned_driver_name,
    u.email as assigned_driver_email,
    u.phone as assigned_driver_phone,
    u.role as assigned_driver_role,
    u.is_active as assigned_driver_active
FROM public.orders o
LEFT JOIN public.users u ON o.assigned_driver_id = u.id;

-- Step 3: Grant permissions
GRANT SELECT ON public.orders_with_drivers TO authenticated;
GRANT SELECT ON public.orders_with_drivers TO anon;

-- Step 4: Verify the fix
SELECT 
    'Fix Verification' as result,
    COUNT(*) as total_columns,
    SUM(CASE WHEN column_name = 'assigned_driver_email' THEN 1 ELSE 0 END) as has_email_column
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'orders_with_drivers';

-- Step 5: Test the view with a sample query
SELECT 
    'Sample Query Test' as test_type,
    COUNT(*) as order_count,
    COUNT(assigned_driver_email) as orders_with_driver_email
FROM public.orders_with_drivers 
LIMIT 1;
EOF

echo ""
echo "-- === END DATABASE FIX ==="
echo ""

echo "✅ Step 3: Application code has been updated with better error handling"
echo "   The dashboard will now gracefully fall back to manual joins if the view has issues."
echo ""

echo "🚀 Step 4: Deployment Instructions:"
echo "   1. Copy the DIAGNOSTIC QUERY above and run it in Supabase SQL Editor"
echo "   2. Review the results to confirm the issue"
echo "   3. Copy the DATABASE FIX query and run it in Supabase SQL Editor"
echo "   4. Refresh your dashboard application"
echo "   5. Check browser console - the error should be resolved"
echo ""

echo "🔍 Step 5: If the issue persists:"
echo "   - Check Supabase RLS policies are not blocking the view"
echo "   - Ensure your user has the correct tenant_id"
echo "   - Check that the users table has the required columns"
echo "   - Verify the foreign key relationship between orders.assigned_driver_id and users.id"
echo ""

echo "📧 The error 'column orders_with_drivers.assigned_driver_email does not exist' should now be resolved!"