-- 🔍 Geofence Diagnostic Script
-- Run this in Supabase SQL Editor to diagnose geofence selection issues

-- ============================================
-- PART 1: Check if enhanced_geofences table exists
-- ============================================
SELECT
    'Table exists: enhanced_geofences' as check_name,
    CASE 
    WHEN EXISTS (
      SELECT
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'enhanced_geofences'
    ) THEN '✅ YES'
    ELSE '❌ NO - Run enhanced-preconfiguration-system.sql first!'
  END as result;

-- ============================================
-- PART 2: Count total geofences
-- ============================================
SELECT
    'Total geofences in database' as check_name,
    COUNT(*)
::text || ' geofences found' as result
FROM enhanced_geofences;

-- ============================================
-- PART 3: Count active geofences
-- ============================================
SELECT
    'Active geofences' as check_name,
    COUNT(*)
::text || ' active geofences' as result
FROM enhanced_geofences
WHERE is_active = true;

-- ============================================
-- PART 4: List all geofences with details
-- ============================================
SELECT
    id,
    geofence_name,
    geofence_type,
    center_latitude,
    center_longitude,
    radius_meters,
    is_active,
    tenant_id,
    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
FROM enhanced_geofences
ORDER BY created_at DESC;

-- ============================================
-- PART 5: Check your user's tenant_id
-- ============================================
SELECT
    'Your user info' as info,
    id as user_id,
    email,
    tenant_id,
    role,
    is_active as user_active
FROM users
WHERE id = auth.uid();

-- ============================================
-- PART 6: Check geofence-tenant matching
-- ============================================
SELECT
    'Geofence-Tenant Match Analysis' as analysis,
    (SELECT tenant_id
    FROM users
    WHERE id = auth.uid()) as your_tenant_id,
    (SELECT COUNT(*)
    FROM enhanced_geofences
    WHERE tenant_id = (SELECT tenant_id
    FROM users
    WHERE id = auth.uid())) as matching_geofences,
    (SELECT COUNT(*)
    FROM enhanced_geofences
    WHERE tenant_id != (SELECT tenant_id
        FROM users
        WHERE id = auth.uid()) OR tenant_id IS NULL) as other_geofences;

-- ============================================
-- PART 7: Check RLS policies
-- ============================================
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression
FROM pg_policies
WHERE tablename = 'enhanced_geofences'
ORDER BY policyname;

-- ============================================
-- PART 8: Test the exact query used by the form
-- ============================================
SELECT
    id,
    geofence_name,
    center_latitude,
    center_longitude,
    radius_meters,
    geofence_type
FROM enhanced_geofences
WHERE tenant_id IN (
  SELECT tenant_id
    FROM users
    WHERE id = auth.uid()
)
    AND is_active = true
ORDER BY geofence_name;

-- ============================================
-- PART 9: Geofence type breakdown
-- ============================================
SELECT
    geofence_type,
    COUNT(*) as count,
    COUNT(*) FILTER
(WHERE is_active = true) as active_count
FROM enhanced_geofences
GROUP BY geofence_type
ORDER BY count DESC;

-- ============================================
-- DIAGNOSTIC RESULTS INTERPRETATION
-- ============================================

/*
✅ HEALTHY SYSTEM:
- Table exists: enhanced_geofences → ✅ YES
- Total geofences → 1 or more
- Active geofences → 1 or more
- Geofence list shows your created geofences
- Your user has valid tenant_id (not null)
- Matching_geofences > 0
- Test query returns rows
- RLS policies exist (at least 2)

❌ ISSUES:
1. Table doesn't exist → Run enhanced-preconfiguration-system.sql
2. Total geofences = 0 → Create geofences at /dashboard/geofences
3. Active geofences = 0 → Activate geofences (see FIX below)
4. Your tenant_id is NULL → User not properly configured
5. Matching_geofences = 0 → Tenant mismatch (see FIX below)
6. Test query returns 0 rows → RLS blocking or tenant mismatch
7. No RLS policies → Run enhanced-preconfiguration-system.sql

FIXES:

-- FIX 1: Activate all geofences
UPDATE enhanced_geofences
SET is_active = true
WHERE is_active = false;

-- FIX 2: Fix tenant mismatch (replace YOUR_EMAIL)
UPDATE enhanced_geofences
SET tenant_id = (
  SELECT tenant_id FROM users WHERE email = 'YOUR_EMAIL@example.com'
)
WHERE tenant_id IS NULL OR tenant_id != (
  SELECT tenant_id FROM users WHERE email = 'YOUR_EMAIL@example.com'
);

-- FIX 3: Verify your user has tenant_id (replace YOUR_EMAIL)
SELECT email, tenant_id, role FROM users WHERE email = 'YOUR_EMAIL@example.com';
-- If tenant_id is NULL, you need to create/assign a tenant first

-- FIX 4: Create sample geofence for testing
INSERT INTO enhanced_geofences (
  tenant_id,
  geofence_name,
  geofence_type,
  center_latitude,
  center_longitude,
  radius_meters,
  is_active,
  created_by
) VALUES (
  (SELECT tenant_id FROM users WHERE id = auth.uid()),
  'Test Warehouse',
  'loading',
  33.9416,
  -118.4085,
  100,
  true,
  auth.uid()
);
*/
