-- Verify user setup and auth linkage

-- Check auth.users
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users
WHERE email = 'heinrich@matanuska.co.za';

-- Check public.users
SELECT 
    id,
    email,
    full_name,
    role,
    tenant_id,
    is_active
FROM public.users
WHERE email = 'heinrich@matanuska.co.za';

-- Check if the IDs match
SELECT 
    'Auth User' as source,
    id,
    email
FROM auth.users
WHERE email = 'heinrich@matanuska.co.za'
UNION ALL
SELECT 
    'Public User' as source,
    id,
    email
FROM public.users
WHERE email = 'heinrich@matanuska.co.za';

-- If IDs don't match, we need to link them
-- Get the auth user ID
SELECT id FROM auth.users WHERE email = 'heinrich@matanuska.co.za';
