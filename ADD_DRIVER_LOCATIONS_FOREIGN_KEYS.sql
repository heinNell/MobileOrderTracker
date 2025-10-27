-- ============================================================================
-- ADD MISSING FOREIGN KEYS TO DRIVER_LOCATIONS
-- ============================================================================
-- This adds back the foreign key relationships after trigger cleanup
-- ============================================================================

-- Step 1: Check current foreign keys
SELECT
    '=== Current Foreign Keys ===' AS info;

SELECT
    conname AS constraint_name,
    confrelid::regclass AS foreign_table,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.driver_locations'
::regclass
  AND contype = 'f';

-- Step 2: Add foreign key to users table (driver_id)
ALTER TABLE public.driver_locations
  DROP CONSTRAINT IF EXISTS driver_locations_driver_id_fkey;

ALTER TABLE public.driver_locations
  ADD CONSTRAINT driver_locations_driver_id_fkey 
  FOREIGN KEY (driver_id) 
  REFERENCES public.users(id) 
  ON DELETE CASCADE;

-- Step 3: Add foreign key to orders table (order_id) - make it forgiving
ALTER TABLE public.driver_locations
  DROP CONSTRAINT IF EXISTS driver_locations_order_id_fkey;

ALTER TABLE public.driver_locations
  ADD CONSTRAINT driver_locations_order_id_fkey 
  FOREIGN KEY (order_id) 
  REFERENCES public.orders(id) 
  ON DELETE SET NULL;

-- Step 4: Verify foreign keys are added
SELECT
    '=== Verification: Foreign Keys Added ===' AS info;

SELECT
    conname AS constraint_name,
    confrelid::regclass AS foreign_table,
    confdeltype AS on_delete,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.driver_locations'
::regclass
  AND contype = 'f'
ORDER BY conname;

-- Step 5: Test the relationships work
SELECT
    '=== Testing Relationships ===' AS info;

-- Test query with joins
SELECT
    dl.id,
    dl.driver_id,
    u.full_name as driver_name,
    dl.order_id,
    o.order_number,
    dl.created_at
FROM public.driver_locations dl
    LEFT JOIN public.users u ON dl.driver_id = u.id
    LEFT JOIN public.orders o ON dl.order_id = o.id
ORDER BY dl.created_at DESC
LIMIT 5;

SELECT '✅ Foreign keys added and tested successfully' AS status;
