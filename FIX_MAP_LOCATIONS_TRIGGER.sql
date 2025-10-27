-- ============================================================================
-- FIX MAP_LOCATIONS TRIGGER ERROR
-- ============================================================================
-- This script fixes the trigger that's causing the "notes" column error
-- and prevents the foreign key violation
-- ============================================================================

-- Step 1: Find and disable/remove the problematic trigger
SELECT 
  'Checking for triggers on driver_locations...' AS status;

SELECT 
  tgname as trigger_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'public.driver_locations'::regclass;

-- Step 2: Drop the problematic trigger function
DROP TRIGGER IF EXISTS fill_driver_location_trigger ON public.driver_locations;
DROP FUNCTION IF EXISTS fill_driver_location_and_propagate() CASCADE;

-- Step 3: Verify triggers are removed
SELECT 
  'Verifying triggers removed...' AS status;

SELECT 
  COUNT(*) as remaining_triggers
FROM pg_trigger t
WHERE tgrelid = 'public.driver_locations'::regclass
  AND tgname = 'fill_driver_location_trigger';

-- Step 4: Make order_id nullable and change foreign key behavior
-- This allows tracking even when order doesn't exist or is deleted
ALTER TABLE public.driver_locations
  ALTER COLUMN order_id DROP NOT NULL;

-- Step 5: Drop and recreate the foreign key constraint to be more forgiving
ALTER TABLE public.driver_locations
  DROP CONSTRAINT IF EXISTS driver_locations_order_id_fkey;

ALTER TABLE public.driver_locations
  ADD CONSTRAINT driver_locations_order_id_fkey 
  FOREIGN KEY (order_id) 
  REFERENCES public.orders(id) 
  ON DELETE SET NULL  -- Set to NULL if order is deleted
  ON UPDATE CASCADE   -- Update if order ID changes
  NOT VALID;          -- Don't validate existing data

-- Step 6: Validate the constraint (this will check only new inserts)
-- Comment this out if you have existing invalid data
-- ALTER TABLE public.driver_locations VALIDATE CONSTRAINT driver_locations_order_id_fkey;

-- Step 7: Clean up existing invalid order_ids
UPDATE public.driver_locations
SET order_id = NULL
WHERE order_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = driver_locations.order_id
  );

-- Step 8: Create a simple, safe trigger that only updates user location
CREATE OR REPLACE FUNCTION update_user_last_location_safe()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update users table, don't touch map_locations
  UPDATE public.users 
  SET 
    last_location_update = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.driver_id;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- If update fails, just log and continue
  RAISE WARNING 'Failed to update user last location: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS update_user_last_location_trigger ON public.driver_locations;

-- Create the safe trigger
CREATE TRIGGER update_user_last_location_trigger
  AFTER INSERT ON public.driver_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_location_safe();

-- Step 9: Verify the fix
SELECT 
  '=== Verification Results ===' AS status;

-- Check table structure
SELECT 
  'Table Structure:' AS info,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'driver_locations'
ORDER BY ordinal_position;

-- Check foreign keys
SELECT
  'Foreign Keys:' AS info,
  conname AS constraint_name,
  confrelid::regclass AS foreign_table,
  confdeltype AS on_delete_action,
  confupdtype AS on_update_action
FROM pg_constraint
WHERE conrelid = 'public.driver_locations'::regclass
  AND contype = 'f';

-- Check triggers
SELECT
  'Active Triggers:' AS info,
  tgname as trigger_name,
  proname as function_name,
  tgtype as trigger_type
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'public.driver_locations'::regclass;

-- Test with a query
SELECT 
  '=== Ready to Test ===' AS status,
  'You can now insert location updates without map_locations errors' AS message;
