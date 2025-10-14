-- 🚨 CRITICAL FIX: Sync auth.users to public.users
-- Run this in your Supabase SQL Editor to fix driver assignments

-- This bypasses RLS policies and syncs the users

BEGIN;

-- Temporarily disable RLS for this operation (only works with service role)
-- If this fails, you'll need to run individual INSERT statements

-- Insert critical users from auth.users to public.users
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  tenant_id,
  is_active,
  created_at,
  updated_at
) VALUES 

-- ⭐ JOHN NOLEN - THE KEY DRIVER (Order ORD-1760104586344)
('5e5ebf46-d35f-4dc4-9025-28fdf81059fd', 'john@gmail.com', 'John Nolen', 'driver', '17ed751d-9c45-4cbb-9ccc-50607c151d43', true, '2025-10-14 13:05:39.667588+00', NOW()),

-- Admin User
('a46e2a06-a773-45db-b060-d51bf151c587', 'www.hjnel@gmail.com', 'Admin User', 'admin', '17ed751d-9c45-4cbb-9ccc-50607c151d43', true, '2025-09-27 12:59:17.890902+00', NOW()),

-- Heinrich Nel (driver)
('b4c0f491-b3f2-4b48-8447-cab1610999e8', 'heinrich@matanuska.com', 'Heinrich Nel', 'driver', '17ed751d-9c45-4cbb-9ccc-50607c151d43', true, '2025-10-09 14:24:41.598917+00', NOW()),

-- Nikkie (driver) 
('c64ff1f7-d317-4f6b-9bb3-8dd93728984b', 'nikkiekriel@gmail.com', 'Nikkie', 'driver', '17ed751d-9c45-4cbb-9ccc-50607c151d43', true, '2025-10-10 05:27:56.014534+00', NOW()),

-- Add other users as needed...
('7d3cdfb1-b7e9-4dec-8671-3bf7e223dc0c', 'heinrich@matanuska.co.zw', 'Heinrich Nel', 'driver', '17ed751d-9c45-4cbb-9ccc-50607c151d43', true, '2025-10-09 08:23:01.778004+00', NOW()),
('1810fcd6-d65c-48ed-a680-db647117e984', 'heinnell64@gmail.com', 'Heinrich Nel', 'driver', '17ed751d-9c45-4cbb-9ccc-50607c151d43', true, '2025-10-09 14:11:28.447711+00', NOW()),
('720ea10c-5328-4821-a8f3-f710a0d176f8', 'nikkie@gmail.com', 'Nikkie', 'driver', '17ed751d-9c45-4cbb-9ccc-50607c151d43', true, '2025-10-13 15:46:12.900953+00', NOW()),
('5d48cad9-b561-402f-ac10-fda2761076ee', 'heinrich@matanuska.co.zc', 'heinrich', 'driver', '17ed751d-9c45-4cbb-9ccc-50607c151d43', true, '2025-10-14 12:36:20.25065+00', NOW()),
('6f64a796-e52f-4ca0-a8cd-40a9c854057b', 'heinnell64@gmail.co', 'heinnell', 'driver', '17ed751d-9c45-4cbb-9ccc-50607c151d43', true, '2025-10-14 12:01:45.051262+00', NOW())

ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = NOW();

COMMIT;

-- Verify the sync worked
SELECT 
  '🎯 VERIFICATION' as status,
  COUNT(*) as total_users
FROM public.users;

-- Show all users
SELECT 
  id, 
  full_name, 
  email, 
  role,
  CASE 
    WHEN id = '5e5ebf46-d35f-4dc4-9025-28fdf81059fd' THEN '⭐ KEY DRIVER FOR ORDER' 
    WHEN role = 'admin' THEN '👑 ADMIN'
    ELSE '🚛 DRIVER'
  END as notes
FROM public.users 
ORDER BY 
  CASE WHEN id = '5e5ebf46-d35f-4dc4-9025-28fdf81059fd' THEN 0 ELSE 1 END,
  role,
  full_name;

-- Test the order assignment
SELECT 
  '📦 ORDER ASSIGNMENT TEST' as status,
  o.order_number,
  o.assigned_driver_id,
  o.status,
  u.full_name as driver_name,
  u.email as driver_email,
  CASE 
    WHEN u.id IS NOT NULL THEN '✅ DRIVER FOUND' 
    ELSE '❌ DRIVER NOT FOUND' 
  END as assignment_status
FROM orders o
LEFT JOIN users u ON o.assigned_driver_id = u.id
WHERE o.order_number = 'ORD-1760104586344';

-- Show ready status for mobile app
SELECT 
  '📱 MOBILE APP READINESS' as status,
  COUNT(*) FILTER (WHERE role = 'driver') as available_drivers,
  COUNT(*) FILTER (WHERE role = 'admin') as available_admins,
  CASE 
    WHEN COUNT(*) FILTER (WHERE role = 'driver') > 0 THEN '✅ READY FOR MOBILE APP'
    ELSE '❌ NO DRIVERS AVAILABLE'
  END as mobile_app_status
FROM public.users;