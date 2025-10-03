-- Step 1: Check if the tenant exists
SELECT id, name FROM public.tenants WHERE id = '17ed751d-9c45-4cbb-9ccc-50607c151d43';

-- Step 2: If tenant doesn't exist, create it with subdomain:
INSERT INTO public.tenants (id, name, subdomain) 
VALUES ('17ed751d-9c45-4cbb-9ccc-50607c151d43', 'Test Company', 'testcompany')
ON CONFLICT (id) DO NOTHING;

-- Step 3: Update the user to ensure it's properly linked
UPDATE public.users 
SET 
  email = 'heinrich@matanuska.co.za',
  full_name = 'Admin User',
  role = 'admin',
  tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43',
  is_active = true
WHERE id = '17ed751d-9c45-4cbb-9ccc-50607c151d43';

-- Step 4: Verify the setup
SELECT 
  u.id, 
  u.email, 
  u.full_name, 
  u.role, 
  u.tenant_id, 
  u.is_active, 
  t.name as tenant_name
FROM public.users u
JOIN public.tenants t ON u.tenant_id = t.id
WHERE u.id = '17ed751d-9c45-4cbb-9ccc-50607c151d43';

-- Step 5: Verify auth user exists
SELECT id, email FROM auth.users WHERE id = '17ed751d-9c45-4cbb-9ccc-50607c151d43';
