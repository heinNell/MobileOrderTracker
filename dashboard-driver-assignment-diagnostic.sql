-- Dashboard Driver Assignment Diagnostic
-- This script diagnoses the specific issue where driver names disappear from dashboard

-- 1. Check if the foreign key constraint exists
SELECT
    'Foreign Key Constraints' as check_type,
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as referenced_table,
    a.attname as column_name,
    af.attname as referenced_column
FROM pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.contype = 'f'
    AND c.conrelid::regclass
::text = 'orders'
AND a.attname = 'assigned_driver_id';

-- 2. Check current orders with driver assignments
SELECT
    'Current Order-Driver Assignments' as check_type,
    o.id,
    o.order_number,
    o.status,
    o.assigned_driver_id,
    u.full_name as driver_name,
    u.email as driver_email,
    u.role as driver_role,
    o.tenant_id,
    o.created_at,
    o.updated_at
FROM public.orders o
    LEFT JOIN public.users u ON o.assigned_driver_id = u.id
WHERE o.assigned_driver_id IS NOT NULL
ORDER BY o.updated_at DESC
LIMIT 10;

-- 3. Test the exact query used by dashboard
SELECT 
    'Dashboard Query Test' as check_type
,
    o.*,
    row_to_json
(assigned_driver.*) as assigned_driver_json
FROM public.orders o
LEFT JOIN
(
    SELECT id, full_name
FROM public.users
)
assigned_driver ON assigned_driver.id = o.assigned_driver_id
WHERE o.tenant_id =
(
    SELECT tenant_id
FROM public.users
WHERE id = auth.uid()
LIMIT 1
)
ORDER BY o.created_at DESC
LIMIT 5;

-- 4. Check if the foreign key name used in dashboard query exists
SELECT
    'Foreign Key Name Check' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_assigned_driver_id_fkey'
        ) THEN 'Foreign key orders_assigned_driver_id_fkey EXISTS'
        ELSE 'Foreign key orders_assigned_driver_id_fkey DOES NOT EXIST'
    END as fkey_status;

-- 5. Check all foreign keys on orders table
SELECT
    'All Orders Foreign Keys' as check_type,
    conname as constraint_name,
    a.attname as column_name,
    confrelid::regclass as referenced_table,
    af.attname as referenced_column
FROM pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.contype = 'f'
    AND c.conrelid::regclass
::text = 'orders';

-- 6. Check for column 'status' existence issues
SELECT
    'Column Status Check' as check_type,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'orders'
    AND column_name = 'status';

-- 7. Check if there are any RLS policies affecting driver visibility
SELECT
    'RLS Policies on Orders' as check_type,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'orders'
    AND schemaname = 'public';

-- 8. Test simple driver assignment query (like mobile app uses)
SELECT
    'Simple Driver Query Test' as check_type,
    COUNT(*) as orders_with_assigned_drivers,
    COUNT(DISTINCT assigned_driver_id) as unique_drivers_assigned
FROM public.orders
WHERE assigned_driver_id IS NOT NULL;

-- 9. Check auth context
SELECT
    'Auth Context' as check_type,
    auth.uid() as current_user_id,
    auth.jwt() ->> 'email' as current_user_email,
    auth.role() as current_role;

-- 10. Check if user can see their own record
SELECT
    'Current User Record' as check_type,
    u.*
FROM public.users u
WHERE u.id = auth.uid();