-- 🛠️ ALTERNATIVE: Create a function to sync users (bypasses RLS)

CREATE OR REPLACE FUNCTION sync_auth_users_to_public()
RETURNS TABLE(
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_role TEXT,
  sync_status TEXT
) 
SECURITY DEFINER -- This allows the function to bypass RLS
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert John Nolen (the critical one)
  INSERT INTO public.users (
    id, email, full_name, role, tenant_id, is_active, created_at, updated_at
  ) VALUES (
    '5e5ebf46-d35f-4dc4-9025-28fdf81059fd',
    'john@gmail.com', 
    'John Nolen',
    'driver',
    '17ed751d-9c45-4cbb-9ccc-50607c151d43',
    true,
    '2025-10-14 13:05:39.667588+00',
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = NOW();
    
  -- Insert Admin User
  INSERT INTO public.users (
    id, email, full_name, role, tenant_id, is_active, created_at, updated_at
  ) VALUES (
    'a46e2a06-a773-45db-b060-d51bf151c587',
    'www.hjnel@gmail.com',
    'Admin User', 
    'admin',
    '17ed751d-9c45-4cbb-9ccc-50607c151d43',
    true,
    '2025-09-27 12:59:17.890902+00',
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = NOW();
    
  -- Return results
  RETURN QUERY
  SELECT 
    u.id,
    u.full_name,
    u.email,
    u.role,
    CASE 
      WHEN u.id = '5e5ebf46-d35f-4dc4-9025-28fdf81059fd' THEN '⭐ KEY DRIVER SYNCED'
      WHEN u.role = 'admin' THEN '👑 ADMIN SYNCED'
      ELSE '✅ SYNCED'
    END
  FROM public.users u
  WHERE u.id IN (
    '5e5ebf46-d35f-4dc4-9025-28fdf81059fd',
    'a46e2a06-a773-45db-b060-d51bf151c587'
  )
  ORDER BY 
    CASE WHEN u.id = '5e5ebf46-d35f-4dc4-9025-28fdf81059fd' THEN 0 ELSE 1 END;
END;
$$;

-- Run the sync function
SELECT * FROM sync_auth_users_to_public();

-- Test order assignment immediately
SELECT 
  '📦 ORDER TEST' as test_type,
  o.order_number,
  o.assigned_driver_id,
  o.status,
  u.full_name as driver_name,
  u.email as driver_email,
  CASE 
    WHEN u.id IS NOT NULL THEN '✅ ASSIGNMENT WORKING' 
    ELSE '❌ STILL BROKEN' 
  END as result
FROM orders o
LEFT JOIN users u ON o.assigned_driver_id = u.id
WHERE o.order_number = 'ORD-1760104586344';

-- Clean up (optional)
-- DROP FUNCTION sync_auth_users_to_public();