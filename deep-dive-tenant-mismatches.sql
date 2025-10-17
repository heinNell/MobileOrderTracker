-- 🔍 DEEP DIVE: Find the exact cause of the remaining 2 mismatches

-- ============================================================================
-- THEORY 1: The problematic drivers might have been assigned to wrong tenant
-- ============================================================================

-- Check if Enock and Nikkie (the ones we just fixed) have the CORRECT tenant now
SELECT 
  '=== Did Our Fix Work? ===' as check_type,
  id,
  email,
  full_name,
  tenant_id,
  CASE 
    WHEN tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43' THEN '✅ FIXED - Correct Tenant'
    WHEN tenant_id IS NULL THEN '❌ STILL BROKEN - NULL'
    ELSE '⚠️ WRONG TENANT: ' || tenant_id::text
  END as fix_status
FROM public.users
WHERE id IN (
  '6231ff64-25dc-4fd1-9c7c-4606f700010d',  -- Enock Mukonyerwa
  '720ea10c-5328-4821-a8f3-f710a0d176f8'   -- Nikkie (duplicate)
);

-- ============================================================================
-- THEORY 2: Maybe there are OTHER drivers with tenant issues
-- ============================================================================

-- Find ALL drivers and show their tenant relationship
SELECT 
  '=== All Drivers Tenant Check ===' as check_type,
  u.id,
  u.full_name,
  u.email,
  u.tenant_id as driver_tenant,
  COUNT(o.id) as assigned_orders,
  ARRAY_AGG(DISTINCT o.tenant_id) FILTER (WHERE o.tenant_id IS NOT NULL) as order_tenants,
  CASE 
    WHEN u.tenant_id IS NULL THEN '❌ Driver has NULL tenant'
    WHEN COUNT(DISTINCT o.tenant_id) = 0 THEN '⚪ No orders assigned'
    WHEN COUNT(DISTINCT o.tenant_id) = 1 AND u.tenant_id = ANY(ARRAY_AGG(o.tenant_id)) THEN '✅ All match'
    ELSE '❌ MISMATCH with orders'
  END as status
FROM public.users u
LEFT JOIN orders o ON o.assigned_driver_id = u.id
WHERE u.role = 'driver'
GROUP BY u.id, u.full_name, u.email, u.tenant_id
ORDER BY status DESC, u.full_name;

-- ============================================================================
-- THEORY 3: Maybe the ORDERS have wrong tenant_id
-- ============================================================================

-- Check the two specific orders that had problems
SELECT 
  '=== Problem Orders Detail ===' as check_type,
  o.id,
  o.order_number,
  o.status,
  o.tenant_id as order_tenant,
  o.assigned_driver_id,
  o.created_at,
  o.updated_at,
  u.full_name as driver_name,
  u.tenant_id as driver_tenant,
  CASE 
    WHEN o.tenant_id IS NULL THEN '❌ Order has NULL tenant'
    WHEN u.tenant_id IS NULL THEN '❌ Driver has NULL tenant'
    WHEN o.tenant_id = u.tenant_id THEN '✅ MATCH'
    ELSE '❌ MISMATCH: Order(' || o.tenant_id::text || ') vs Driver(' || u.tenant_id::text || ')'
  END as match_status
FROM orders o
LEFT JOIN users u ON o.assigned_driver_id = u.id
WHERE o.order_number IN ('ORD-1760599769131', 'ORD-1759507343591')
   OR o.id IN (
     'caccb211-c1bc-4cdc-8c92-1b074955c378',
     '1bbd73f2-e05e-423f-b57f-cfc8206f6e83'
   );

-- ============================================================================
-- THEORY 4: Check if there are duplicate driver accounts
-- ============================================================================

-- Find drivers with same name/email
SELECT 
  '=== Duplicate Driver Check ===' as check_type,
  full_name,
  COUNT(*) as account_count,
  ARRAY_AGG(id::text) as driver_ids,
  ARRAY_AGG(email) as emails,
  ARRAY_AGG(tenant_id::text) as tenant_ids,
  ARRAY_AGG(is_active::text) as active_status
FROM public.users
WHERE role = 'driver'
GROUP BY full_name
HAVING COUNT(*) > 1;

-- ============================================================================
-- SOLUTION: If orders have wrong tenant, fix them
-- ============================================================================

-- Show what needs to be fixed (don't run yet, just show)
SELECT 
  '=== POTENTIAL FIX: Update Order Tenant IDs ===' as action,
  o.id as order_id,
  o.order_number,
  o.tenant_id as current_order_tenant,
  u.tenant_id as driver_tenant,
  CASE 
    WHEN o.tenant_id != u.tenant_id THEN 
      'UPDATE orders SET tenant_id = ''' || u.tenant_id::text || ''' WHERE id = ''' || o.id::text || ''';'
    ELSE 'No fix needed'
  END as sql_fix
FROM orders o
JOIN users u ON o.assigned_driver_id = u.id
WHERE o.tenant_id != u.tenant_id
   OR o.tenant_id IS NULL
   OR u.tenant_id IS NULL;

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================
-- 
-- Run each section to find out:
-- 1. Did our driver tenant_id fix work?
-- 2. Are there OTHER drivers with tenant issues?
-- 3. Do the ORDERS have wrong tenant_id?
-- 4. Are there duplicate driver accounts?
-- 
-- Based on results, we'll know whether to:
-- - Fix more drivers
-- - Fix the orders
-- - Merge duplicate accounts
-- ============================================================================
