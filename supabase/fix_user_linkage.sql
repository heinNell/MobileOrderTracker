-- Fix User Linkage
-- This will properly link your auth user to the public.users table

-- Step 1: Check if user already exists in public.users with the auth ID
SELECT id, email, full_name, role, tenant_id 
FROM public.users 
WHERE id = 'b1f554db-145a-40f6-b572-fb7cae1ae32b';

-- Step 2: Check if there's an old user record with different ID
SELECT id, email, full_name, role, tenant_id 
FROM public.users 
WHERE email = 'heinrich@matanuska.co.za';

-- Step 3: Delete old user record if it exists (if ID doesn't match auth ID)
DELETE FROM public.users 
WHERE email = 'heinrich@matanuska.co.za' 
AND id != 'b1f554db-145a-40f6-b572-fb7cae1ae32b';

-- Step 4: Insert/Update the correct user record with matching auth ID
INSERT INTO public.users (id, email, full_name, role, tenant_id, is_active)
VALUES (
  'b1f554db-145a-40f6-b572-fb7cae1ae32b',  -- Must match auth.users ID
  'heinrich@matanuska.co.za',
  'Admin User',
  'admin',
  '17ed751d-9c45-4cbb-9ccc-50607c151d43',  -- Your existing tenant ID
  true
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  tenant_id = EXCLUDED.tenant_id,
  is_active = EXCLUDED.is_active;

-- Step 5: Verify the fix
SELECT 
  u.id, 
  u.email, 
  u.full_name, 
  u.role, 
  u.tenant_id, 
  u.is_active,
  t.name as tenant_name,
  'Match: ' || (u.id::text = a.id::text) as ids_match
FROM public.users u
JOIN public.tenants t ON u.tenant_id = t.id
CROSS JOIN auth.users a
WHERE u.email = 'heinrich@matanuska.co.za'
AND a.email = 'heinrich@matanuska.co.za';
