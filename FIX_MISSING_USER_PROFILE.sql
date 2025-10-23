-- Fix for missing user in public.users table
-- This creates the user profile that links auth.users to public.users

-- ============================================================================
-- STEP 1: CHECK CURRENT SITUATION
-- ============================================================================

-- Check if user exists in auth (should return 1 row)
SELECT 
  '🔍 User in auth.users' as info,
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
WHERE email = 'www.hjnel@gmail.com';

-- Check if user exists in public.users (probably returns 0 rows - THIS IS THE PROBLEM)
SELECT 
  '🔍 User in public.users' as info,
  id,
  email,
  role,
  tenant_id,
  is_active
FROM public.users
WHERE email = 'www.hjnel@gmail.com';

-- Check available tenants
SELECT 
  '🏢 Available Tenants' as info,
  id,
  name,
  is_active,
  created_at
FROM public.tenants
ORDER BY created_at
LIMIT 5;

-- ============================================================================
-- STEP 2: CREATE THE MISSING USER PROFILE
-- ============================================================================

-- Insert the user profile into public.users table
-- This links the auth user to the application
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  tenant_id,
  is_active,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', 'Admin User') as full_name,
  'admin' as role,  -- Setting as admin for dashboard access
  (SELECT id FROM public.tenants ORDER BY created_at LIMIT 1) as tenant_id,  -- Assign to first tenant
  true as is_active,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
WHERE au.email = 'www.hjnel@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
  );

-- ============================================================================
-- STEP 3: VERIFY THE FIX
-- ============================================================================

-- Check that user now exists in public.users
SELECT 
  '✅ User now in public.users' as info,
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.tenant_id,
  t.name as tenant_name,
  u.is_active
FROM public.users u
LEFT JOIN public.tenants t ON u.tenant_id = t.id
WHERE u.email = 'www.hjnel@gmail.com';

-- ============================================================================
-- STEP 4: FIX ALL OTHER AUTH USERS MISSING FROM PUBLIC.USERS
-- ============================================================================

-- This will create profiles for ALL auth users that don't have a public.users entry
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  tenant_id,
  is_active,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as full_name,
  COALESCE(au.raw_user_meta_data->>'role', 'admin') as role,
  (SELECT id FROM public.tenants ORDER BY created_at LIMIT 1) as tenant_id,
  true as is_active,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
AND au.raw_user_meta_data->>'role' != 'driver';  -- Don't create user profiles for drivers

-- ============================================================================
-- STEP 5: CREATE TRIGGER TO AUTO-SYNC NEW USERS
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_auth_user();

-- Create function to automatically create public.users entry
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role text;
  default_tenant_id uuid;
BEGIN
  -- Get role from metadata, default to 'admin'
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'admin');
  
  -- Only create public.users entry for non-drivers
  IF user_role != 'driver' THEN
    -- Get first tenant
    SELECT id INTO default_tenant_id FROM public.tenants ORDER BY created_at LIMIT 1;
    
    -- If no tenant exists, create default one
    IF default_tenant_id IS NULL THEN
      INSERT INTO public.tenants (name, is_active)
      VALUES ('Default Organization', true)
      RETURNING id INTO default_tenant_id;
    END IF;
    
    -- Insert into public.users
    INSERT INTO public.users (
      id,
      email,
      full_name,
      role,
      tenant_id,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      user_role,
      default_tenant_id,
      true,
      NEW.created_at,
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;  -- Don't fail if user already exists
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================================
-- STEP 6: VERIFY ALL USERS
-- ============================================================================

-- Show all auth users and their public.users status
SELECT 
  '📊 Auth Users Status' as info,
  au.id,
  au.email,
  au.raw_user_meta_data->>'role' as auth_role,
  CASE 
    WHEN pu.id IS NOT NULL THEN '✅ Has profile'
    ELSE '❌ Missing profile'
  END as profile_status,
  pu.role as public_role,
  pu.tenant_id
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC;

-- Show dashboard users (non-drivers)
SELECT 
  '👥 Dashboard Users' as info,
  u.id,
  u.email,
  u.full_name,
  u.role,
  t.name as tenant_name,
  u.is_active
FROM public.users u
LEFT JOIN public.tenants t ON u.tenant_id = t.id
WHERE u.role != 'driver'
ORDER BY u.created_at DESC;

-- Show drivers (for mobile app)
SELECT 
  '📱 Mobile App Drivers' as info,
  d.id,
  d.full_name,
  u.email,
  d.phone,
  t.name as tenant_name,
  d.is_active
FROM public.drivers d
LEFT JOIN public.users u ON d.id = u.id
LEFT JOIN public.tenants t ON d.tenant_id = t.id
ORDER BY d.created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 7: SUCCESS MESSAGE
-- ============================================================================

SELECT '✅ FIX COMPLETE!' as result;
SELECT '📋 Summary:' as info;
SELECT '  1. Created missing user profile for www.hjnel@gmail.com' as step_1;
SELECT '  2. Fixed all other auth users missing public.users entries' as step_2;
SELECT '  3. Created auto-sync trigger for new users' as step_3;
SELECT '  4. Drivers remain separate (for mobile app only)' as step_4;
SELECT '' as separator;
SELECT '🔄 Next Steps:' as next_steps;
SELECT '  1. Log out from the dashboard' as action_1;
SELECT '  2. Log back in with www.hjnel@gmail.com' as action_2;
SELECT '  3. You should now see the dashboard properly!' as action_3;
