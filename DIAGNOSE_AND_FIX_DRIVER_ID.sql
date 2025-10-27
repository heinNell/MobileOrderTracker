-- ============================================================================
-- DIAGNOSE AND FIX DRIVER_ID MISMATCH ISSUE
-- ============================================================================
-- This script helps diagnose and fix the foreign key violation error:
-- "Key (driver_id)=(...) is not present in table users"
-- ============================================================================

-- Step 1: Check if the problematic driver_id exists in users table
SELECT
    'Checking if driver exists...' AS step,
    CASE 
    WHEN EXISTS (SELECT 1
    FROM public.users
    WHERE id = '100040d8-8e98-4bfe-8387-a9d611f20f1f') 
    THEN '✅ Driver EXISTS in users table'
    ELSE '❌ Driver NOT FOUND in users table'
  END AS result;

-- Step 2: List all users with role 'driver'
SELECT
    '=== ALL DRIVERS IN SYSTEM ===' AS section;

SELECT
    id,
    email,
    full_name,
    role,
    is_active,
    created_at
FROM public.users
WHERE role = 'driver'
ORDER BY created_at DESC;

-- Step 3: Check recent authentication attempts
SELECT
    '=== RECENT AUTH SESSIONS ===' AS section;

-- Note: This requires access to auth.users table (Supabase internal)
-- You may need to run this with elevated permissions

-- Step 4: Check if there are any orphaned assignments in orders
SELECT
    '=== ORDERS WITH INVALID DRIVER ASSIGNMENTS ===' AS section;

SELECT
    o.id,
    o.order_number,
    o.assigned_driver_id,
    o.status,
    CASE 
    WHEN u.id IS NULL THEN '❌ Driver not found'
    ELSE '✅ Driver exists'
  END AS driver_status
FROM public.orders o
    LEFT JOIN public.users u ON o.assigned_driver_id = u.id
WHERE o.assigned_driver_id IS NOT NULL
    AND u.id IS NULL;

-- Step 5: TEMPORARY FIX - Make driver_id nullable to allow inserts without valid driver
-- WARNING: This is a temporary workaround. The real fix is to ensure valid driver_ids.

-- Uncomment the following line to allow nullable driver_id (NOT RECOMMENDED for production)
-- ALTER TABLE public.driver_locations ALTER COLUMN driver_id DROP NOT NULL;

-- Step 6: BETTER FIX - Relax the foreign key constraint to allow inserts
-- and clean up later, OR use ON DELETE SET NULL instead of CASCADE

-- Option A: Drop the constraint temporarily (for testing only)
/*
ALTER TABLE public.driver_locations 
  DROP CONSTRAINT IF EXISTS driver_locations_driver_id_fkey;
  
-- Re-add with SET NULL on delete
ALTER TABLE public.driver_locations
  ADD CONSTRAINT driver_locations_driver_id_fkey 
  FOREIGN KEY (driver_id) 
  REFERENCES public.users(id) 
  ON DELETE SET NULL;
*/

-- Step 7: RECOMMENDED FIX - Update mobile app to use correct driver_id
-- Check what the mobile app is sending vs what's in the database

SELECT
    '=== MOBILE APP DIAGNOSTIC ===' AS section,
    'Check the following:' AS instruction;

SELECT
    '1. Mobile app user ID: Check what auth.uid() returns in the app' AS step_1,
    '2. Verify user exists in database with that ID' AS step_2,
    '3. Ensure user has role = ''driver''' AS step_3,
    '4. Check if user was recently created or migrated' AS step_4;

-- Step 8: Create a test driver user (if needed)
-- Uncomment to create a test driver with the problematic ID

/*
-- WARNING: Only use this if you're sure this ID should exist
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  '100040d8-8e98-4bfe-8387-a9d611f20f1f',
  'test.driver@example.com',
  'Test Driver',
  'driver',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
*/

-- Step 9: Alternative - Clean up invalid location records
-- This removes any location records that reference non-existent users

SELECT
    '=== CLEANUP INVALID LOCATIONS ===' AS section;

-- First, check how many invalid records exist
SELECT
    COUNT(*) as invalid_location_count
FROM public.driver_locations dl
    LEFT JOIN public.users u ON dl.driver_id = u.id
WHERE u.id IS NULL;

-- Uncomment to delete invalid location records
/*
DELETE FROM public.driver_locations
WHERE driver_id IN (
  SELECT dl.driver_id
  FROM public.driver_locations dl
  LEFT JOIN public.users u ON dl.driver_id = u.id
  WHERE u.id IS NULL
);
*/

-- Step 10: PERMANENT FIX - Modify RLS policy to prevent invalid inserts
-- Update the INSERT policy to ensure the driver exists

DROP POLICY
IF EXISTS "Drivers can insert own location updates" ON public.driver_locations;

CREATE POLICY "Drivers can insert own location updates" 
ON public.driver_locations 
FOR
INSERT 
TO authenticated 
WITH CHECK (
-- Ensure auth.uid() matches driver_id
auth.uid()
= driver_id 
  AND 
  -- Ensure the user exists and is a driver
  EXISTS
(
    SELECT 1
FROM public.users
WHERE id = auth.uid()
    AND role = 'driver'
    AND is_active = true
  )
);

-- Final verification
SELECT
    '=== FINAL VERIFICATION ===' AS section;

SELECT
    'RLS Policy updated successfully' AS status,
    'Mobile app should now only insert with valid, authenticated driver IDs' AS result;

-- Display summary
SELECT
    '=== SUMMARY ===' AS section,
    'Run this diagnostic to identify the root cause' AS instruction,
    'Uncomment the appropriate fix based on your findings' AS note;
