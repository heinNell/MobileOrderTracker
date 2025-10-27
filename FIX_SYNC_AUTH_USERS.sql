-- ============================================================================
-- QUICK FIX: Sync Authenticated Users with Users Table
-- ============================================================================
-- This fixes the foreign key violation by ensuring authenticated users
-- exist in the public.users table
-- ============================================================================

-- Step 1: Check authenticated users vs users table
SELECT 
  '=== AUTHENTICATED USERS NOT IN PUBLIC.USERS ===' AS check_title;

-- List users from auth.users that don't exist in public.users
SELECT 
  au.id,
  au.email,
  au.created_at as auth_created_at,
  au.last_sign_in_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC;

-- Step 2: Add the missing user to public.users table
-- Replace with actual user details from your system

INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  is_active,
  tenant_id,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  'driver' as role,  -- Set as driver
  true as is_active,
  (SELECT id FROM public.tenants LIMIT 1) as tenant_id,  -- Use first tenant or specify
  au.created_at,
  NOW() as updated_at
FROM auth.users au
WHERE au.id = '100040d8-8e98-4bfe-8387-a9d611f20f1f'
  AND NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = au.id
  );

-- Step 3: Verify the user was added
SELECT 
  '=== VERIFICATION ===' AS check_title;

SELECT 
  id,
  email,
  full_name,
  role,
  is_active,
  tenant_id,
  created_at
FROM public.users
WHERE id = '100040d8-8e98-4bfe-8387-a9d611f20f1f';

-- Step 4: PERMANENT FIX - Create trigger to auto-sync new auth users
-- This prevents the issue from happening again

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_tenant_id UUID;
BEGIN
  -- Get the first tenant ID (or use a specific one)
  SELECT id INTO default_tenant_id FROM public.tenants LIMIT 1;
  
  -- If no tenant exists, you may want to create one or handle differently
  IF default_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant found. Please create a tenant first.';
  END IF;

  -- Insert into public.users if not exists
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    is_active,
    tenant_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'driver'), -- Default to driver
    true,
    COALESCE(
      (NEW.raw_user_meta_data->>'tenant_id')::UUID,
      default_tenant_id
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users (requires SUPERUSER or proper permissions)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Sync ALL existing auth users to public.users
-- This is a one-time sync for all existing users

INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  is_active,
  tenant_id,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  COALESCE(au.raw_user_meta_data->>'role', 'driver') as role,
  true as is_active,
  COALESCE(
    (au.raw_user_meta_data->>'tenant_id')::UUID,
    (SELECT id FROM public.tenants LIMIT 1)
  ) as tenant_id,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Step 6: Verify all users synced
SELECT 
  '=== FINAL SYNC VERIFICATION ===' AS check_title;

SELECT 
  COUNT(*) as auth_users_count
FROM auth.users;

SELECT 
  COUNT(*) as public_users_count
FROM public.users;

SELECT 
  COUNT(*) as unsynced_users_count
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- Display result
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM auth.users au LEFT JOIN public.users pu ON au.id = pu.id WHERE pu.id IS NULL) = 0
    THEN '✅ All users synced successfully'
    ELSE '⚠️ Some users still not synced'
  END as sync_status;
