-- 🔍 Diagnostic Script: Drivers Disappearing Issue
-- Run this in Supabase SQL Editor to investigate why drivers are disappearing

-- ============================================================================
-- SECTION 1: Check All Drivers and Their Status
-- ============================================================================
SELECT 
  '=== ALL DRIVERS STATUS ===' as section,
  '' as id,
  '' as email,
  '' as full_name,
  '' as role,
  '' as is_active,
  '' as tenant_id,
  '' as last_sign_in,
  '' as created_at,
  '' as updated_at,
  '' as status,
  '' as tenant_status;

SELECT 
  '' as section,
  id,
  email,
  full_name,
  role,
  CASE WHEN is_active THEN 'Active' ELSE 'INACTIVE' END as is_active,
  COALESCE(tenant_id::text, 'NULL') as tenant_id,
  TO_CHAR(last_sign_in_at, 'YYYY-MM-DD HH24:MI:SS') as last_sign_in,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
  TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at,
  CASE 
    WHEN is_active = true THEN '✅ Active'
    ELSE '❌ INACTIVE'
  END as status,
  CASE 
    WHEN tenant_id IS NULL THEN '⚠️ No Tenant'
    ELSE '✅ Has Tenant'
  END as tenant_status
FROM public.users
WHERE role = 'driver'
ORDER BY updated_at DESC;

-- ============================================================================
-- SECTION 2: Driver Statistics Summary
-- ============================================================================
SELECT 
  '=== DRIVER STATISTICS ===' as section,
  '' as metric,
  '' as count;

SELECT 
  '' as section,
  'Total Drivers' as metric,
  COUNT(*)::text as count
FROM public.users
WHERE role = 'driver'
UNION ALL
SELECT 
  '' as section,
  'Active Drivers' as metric,
  COUNT(*)::text as count
FROM public.users
WHERE role = 'driver' AND is_active = true
UNION ALL
SELECT 
  '' as section,
  'Inactive Drivers' as metric,
  COUNT(*)::text as count
FROM public.users
WHERE role = 'driver' AND is_active = false
UNION ALL
SELECT 
  '' as section,
  'Drivers Without Tenant' as metric,
  COUNT(*)::text as count
FROM public.users
WHERE role = 'driver' AND tenant_id IS NULL;

-- ============================================================================
-- SECTION 3: Check Tenant Consistency Between Orders and Drivers
-- ============================================================================
SELECT 
  '=== TENANT CONSISTENCY CHECK ===' as section,
  '' as order_id,
  '' as order_number,
  '' as order_status,
  '' as order_tenant,
  '' as driver_id,
  '' as driver_name,
  '' as driver_tenant,
  '' as driver_active,
  '' as tenant_match;

SELECT 
  '' as section,
  o.id as order_id,
  o.order_number,
  o.status as order_status,
  COALESCE(o.tenant_id::text, 'NULL') as order_tenant,
  COALESCE(o.assigned_driver_id::text, 'NONE') as driver_id,
  COALESCE(u.full_name, 'N/A') as driver_name,
  COALESCE(u.tenant_id::text, 'NULL') as driver_tenant,
  CASE 
    WHEN u.is_active THEN 'Active' 
    WHEN u.is_active = false THEN 'INACTIVE'
    ELSE 'N/A'
  END as driver_active,
  CASE 
    WHEN o.assigned_driver_id IS NULL THEN '⚪ No Driver'
    WHEN o.tenant_id = u.tenant_id THEN '✅ Match'
    WHEN o.tenant_id IS NULL THEN '⚠️ Order No Tenant'
    WHEN u.tenant_id IS NULL THEN '⚠️ Driver No Tenant'
    ELSE '❌ MISMATCH - CRITICAL'
  END as tenant_match
FROM orders o
LEFT JOIN users u ON o.assigned_driver_id = u.id
ORDER BY o.created_at DESC
LIMIT 50;

-- ============================================================================
-- SECTION 4: Recently Updated Drivers (Potential Deactivations)
-- ============================================================================
SELECT 
  '=== RECENTLY UPDATED DRIVERS ===' as section,
  '' as id,
  '' as full_name,
  '' as email,
  '' as is_active,
  '' as tenant_id,
  '' as updated_at,
  '' as time_since_update;

SELECT 
  '' as section,
  id,
  full_name,
  email,
  CASE WHEN is_active THEN 'Active' ELSE 'INACTIVE' END as is_active,
  COALESCE(tenant_id::text, 'NULL') as tenant_id,
  TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at,
  AGE(NOW(), updated_at) as time_since_update
FROM public.users
WHERE role = 'driver'
  AND updated_at > NOW() - INTERVAL '7 days'
ORDER BY updated_at DESC;

-- ============================================================================
-- SECTION 5: Driver Activity Summary
-- ============================================================================
SELECT 
  '=== DRIVER ACTIVITY SUMMARY ===' as section,
  '' as driver_id,
  '' as full_name,
  '' as email,
  '' as is_active,
  '' as tenant_id,
  '' as last_sign_in,
  '' as assigned_orders,
  '' as last_order_date;

SELECT 
  '' as section,
  u.id as driver_id,
  u.full_name,
  u.email,
  CASE WHEN u.is_active THEN 'Active' ELSE 'INACTIVE' END as is_active,
  COALESCE(u.tenant_id::text, 'NULL') as tenant_id,
  TO_CHAR(u.last_sign_in_at, 'YYYY-MM-DD HH24:MI:SS') as last_sign_in,
  COUNT(o.id)::text as assigned_orders,
  TO_CHAR(MAX(o.created_at), 'YYYY-MM-DD HH24:MI:SS') as last_order_date
FROM public.users u
LEFT JOIN orders o ON o.assigned_driver_id = u.id
WHERE u.role = 'driver'
GROUP BY u.id, u.full_name, u.email, u.is_active, u.tenant_id, u.last_sign_in_at
ORDER BY MAX(o.created_at) DESC NULLS LAST;

-- ============================================================================
-- SECTION 6: Check for Orphaned Orders (Driver Doesn't Exist)
-- ============================================================================
SELECT 
  '=== ORPHANED ORDERS (Driver Not Found) ===' as section,
  '' as order_id,
  '' as order_number,
  '' as assigned_driver_id,
  '' as order_status,
  '' as created_at;

SELECT 
  '' as section,
  o.id as order_id,
  o.order_number,
  o.assigned_driver_id::text,
  o.status as order_status,
  TO_CHAR(o.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
FROM orders o
WHERE o.assigned_driver_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = o.assigned_driver_id
  )
ORDER BY o.created_at DESC;

-- ============================================================================
-- SECTION 7: Check RLS Policies on Users Table
-- ============================================================================
SELECT 
  '=== RLS POLICIES ON USERS TABLE ===' as section,
  '' as policyname,
  '' as cmd,
  '' as roles,
  '' as using_clause,
  '' as with_check;

SELECT 
  '' as section,
  policyname,
  cmd,
  ARRAY_TO_STRING(roles, ', ') as roles,
  pg_get_expr(qual, 'users'::regclass) as using_clause,
  pg_get_expr(with_check, 'users'::regclass) as with_check
FROM pg_policy
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;

-- ============================================================================
-- SECTION 8: Check for Database Triggers on Users Table
-- ============================================================================
SELECT 
  '=== TRIGGERS ON USERS TABLE ===' as section,
  '' as trigger_name,
  '' as event,
  '' as timing,
  '' as enabled;

SELECT 
  '' as section,
  tgname as trigger_name,
  CASE 
    WHEN tgtype & 2 > 0 THEN 'BEFORE'
    WHEN tgtype & 64 > 0 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END as timing,
  CASE 
    WHEN tgtype & 4 > 0 THEN 'INSERT'
    WHEN tgtype & 8 > 0 THEN 'DELETE'
    WHEN tgtype & 16 > 0 THEN 'UPDATE'
    ELSE 'OTHER'
  END as event,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ Enabled'
    WHEN tgenabled = 'D' THEN '❌ Disabled'
    ELSE tgenabled::text
  END as enabled
FROM pg_trigger
WHERE tgrelid = 'public.users'::regclass
  AND NOT tgisinternal
ORDER BY tgname;

-- ============================================================================
-- SECTION 9: Inactive Drivers with Recent Order Assignments
-- ============================================================================
SELECT 
  '=== INACTIVE DRIVERS WITH RECENT ORDERS ===' as section,
  '' as driver_id,
  '' as driver_name,
  '' as is_active,
  '' as tenant_id,
  '' as updated_at,
  '' as recent_orders;

SELECT 
  '' as section,
  u.id as driver_id,
  u.full_name as driver_name,
  'INACTIVE' as is_active,
  COALESCE(u.tenant_id::text, 'NULL') as tenant_id,
  TO_CHAR(u.updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at,
  COUNT(o.id)::text as recent_orders
FROM public.users u
LEFT JOIN orders o ON o.assigned_driver_id = u.id 
  AND o.created_at > NOW() - INTERVAL '30 days'
WHERE u.role = 'driver'
  AND u.is_active = false
GROUP BY u.id, u.full_name, u.tenant_id, u.updated_at
HAVING COUNT(o.id) > 0
ORDER BY u.updated_at DESC;

-- ============================================================================
-- SECTION 10: Tenant Information
-- ============================================================================
SELECT 
  '=== TENANT INFORMATION ===' as section,
  '' as tenant_id,
  '' as tenant_name,
  '' as is_active,
  '' as driver_count;

SELECT 
  '' as section,
  t.id::text as tenant_id,
  t.name as tenant_name,
  CASE WHEN t.is_active THEN 'Active' ELSE 'Inactive' END as is_active,
  COUNT(u.id)::text as driver_count
FROM tenants t
LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'driver'
GROUP BY t.id, t.name, t.is_active
ORDER BY t.name;

-- ============================================================================
-- SUMMARY AND RECOMMENDATIONS
-- ============================================================================
SELECT 
  '=== DIAGNOSTIC SUMMARY ===' as section,
  '' as check,
  '' as result;

SELECT 
  '' as section,
  'Inactive Drivers Found' as check,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ None - Good!'
    WHEN COUNT(*) > 0 THEN '⚠️ ' || COUNT(*)::text || ' inactive drivers found'
    ELSE 'Error'
  END as result
FROM public.users
WHERE role = 'driver' AND is_active = false
UNION ALL
SELECT 
  '' as section,
  'Drivers Without Tenant' as check,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ None - Good!'
    WHEN COUNT(*) > 0 THEN '❌ ' || COUNT(*)::text || ' drivers without tenant_id'
    ELSE 'Error'
  END as result
FROM public.users
WHERE role = 'driver' AND tenant_id IS NULL
UNION ALL
SELECT 
  '' as section,
  'Tenant Mismatches' as check,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ None - Good!'
    WHEN COUNT(*) > 0 THEN '❌ ' || COUNT(*)::text || ' orders with tenant mismatch'
    ELSE 'Error'
  END as result
FROM orders o
JOIN users u ON o.assigned_driver_id = u.id
WHERE o.tenant_id != u.tenant_id;

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================
-- 
-- After running this script:
-- 
-- 1. Check SECTION 1 for inactive drivers
--    - Are there drivers marked as inactive?
--    - When were they updated?
-- 
-- 2. Check SECTION 3 for tenant mismatches
--    - Do any orders show "❌ MISMATCH"?
--    - This would cause drivers to disappear from orders
-- 
-- 3. Check SECTION 4 for recent updates
--    - Were any drivers updated recently?
--    - This might indicate automated deactivation
-- 
-- 4. Check SECTION 7 for RLS policies
--    - Are there policies filtering by is_active?
--    - Are there policies filtering by tenant_id?
-- 
-- 5. Check SECTION 8 for triggers
--    - Are there any triggers that might deactivate drivers?
-- 
-- 6. Check SECTION 9 for the main issue
--    - Are there INACTIVE drivers with recent orders?
--    - This is the smoking gun!
-- 
-- Share the results with the development team for analysis.
-- ============================================================================
