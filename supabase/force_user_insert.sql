-- Direct fix for user linkage - bypasses RLS
-- Run this as a single block in Supabase SQL Editor

BEGIN;

-- Step 1: Temporarily disable RLS to ensure insert works
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 2: Delete old user record if exists
DELETE FROM public.users 
WHERE email = 'heinrich@matanuska.co.za';

-- Step 3: Insert the correct user record with matching auth ID
INSERT INTO public.users (id, email, full_name, role, tenant_id, is_active)
VALUES (
  'b1f554db-145a-40f6-b572-fb7cae1ae32b',  -- Auth user ID
  'heinrich@matanuska.co.za',
  'Admin User',
  'admin',
  '17ed751d-9c45-4cbb-9ccc-50607c151d43',
  true
);

-- Step 4: Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 5: Verify
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
WHERE u.id = 'b1f554db-145a-40f6-b572-fb7cae1ae32b';

COMMIT;
