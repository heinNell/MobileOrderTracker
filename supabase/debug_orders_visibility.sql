-- Debug: Check if orders exist and are visible

-- 1. Check total orders in database (bypassing RLS)
SELECT COUNT(*) as total_orders FROM orders;

-- 2. Check your user details
SELECT id, email, role, tenant_id, is_active
FROM users
WHERE id = auth.uid();

-- 3. Try to fetch orders as your user (with RLS)
SELECT 
    id, 
    order_number, 
    status, 
    tenant_id,
    assigned_driver_id,
    loading_point_name,
    unloading_point_name,
    created_at
FROM orders
ORDER BY created_at DESC;

-- 4. Check if there's a foreign key constraint issue
SELECT 
    o.id,
    o.order_number,
    o.tenant_id,
    o.assigned_driver_id,
    d.full_name as driver_name
FROM orders o
LEFT JOIN users d ON d.id = o.assigned_driver_id
ORDER BY o.created_at DESC;

-- 5. Check what the dashboard query returns
SELECT 
    o.*,
    d.id as driver_id,
    d.full_name as driver_full_name,
    d.phone as driver_phone
FROM orders o
LEFT JOIN users d ON d.id = o.assigned_driver_id
ORDER BY o.created_at DESC;
