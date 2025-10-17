-- 🔍 INVESTIGATE: Why do 2 orders still have tenant mismatches?
-- The drivers now have tenant_id, so let's see what's wrong

-- ============================================================================
-- Check the 2 orders with mismatches
-- ============================================================================

SELECT
    o.id,
    o.order_number,
    o.status,
    o.tenant_id as order_tenant_id,
    o.assigned_driver_id,
    u.id as driver_id_check,
    u.full_name as driver_name,
    u.tenant_id as driver_tenant_id,
    u.is_active as driver_is_active,
    CASE 
    WHEN o.tenant_id = u.tenant_id THEN '✅ MATCH'
    WHEN o.tenant_id IS NULL THEN '⚠️ Order has NULL tenant'
    WHEN u.tenant_id IS NULL THEN '⚠️ Driver has NULL tenant'
    WHEN o.tenant_id != u.tenant_id THEN '❌ DIFFERENT TENANTS'
    ELSE '❓ Unknown'
  END as match_status,
    o.tenant_id::text || ' vs ' || u.tenant_id::text as tenant_comparison
FROM orders o
    JOIN users u ON o.assigned_driver_id = u.id
WHERE o.tenant_id != u.tenant_id
    OR o.tenant_id IS NULL
    OR u.tenant_id IS NULL
ORDER BY o.created_at DESC;

-- ============================================================================
-- Check if it's the specific orders we know about
-- ============================================================================

SELECT
    'Checking Known Problem Orders' as info,
    o.order_number,
    o.tenant_id as order_tenant,
    u.full_name as driver_name,
    u.tenant_id as driver_tenant,
    CASE 
    WHEN o.tenant_id = u.tenant_id THEN '✅ NOW FIXED'
    ELSE '❌ STILL BROKEN'
  END as status
FROM orders o
    JOIN users u ON o.assigned_driver_id = u.id
WHERE o.order_number IN ('ORD-1760599769131', 'ORD-1759507343591');

-- ============================================================================
-- List ALL drivers with their tenant_ids (verify the fix worked)
-- ============================================================================

SELECT
    'All Drivers Status' as info,
    id,
    email,
    full_name,
    role,
    tenant_id,
    is_active,
    CASE 
    WHEN tenant_id IS NULL THEN '❌ NULL'
    WHEN tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43' THEN '✅ Correct Tenant'
    ELSE '⚠️ Different Tenant: ' || tenant_id::text
  END as tenant_status
FROM public.users
WHERE role = 'driver'
ORDER BY full_name;

-- ============================================================================
-- Check if there are orders with NULL tenant_id
-- ============================================================================

SELECT
    'Orders With NULL Tenant' as info,
    id,
    order_number,
    status,
    tenant_id,
    assigned_driver_id,
    created_at
FROM orders
WHERE tenant_id IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- Possible Issue: Maybe the orders themselves have wrong tenant_id?
-- ============================================================================

SELECT 
  'Orders Tenant Distribution' as info
,
  tenant_id,
  COUNT
(*) as order_count,
  ARRAY_AGG
(order_number ORDER BY created_at DESC) FILTER
(WHERE order_number IS NOT NULL) as sample_orders
FROM orders
GROUP BY tenant_id
ORDER BY order_count DESC;
