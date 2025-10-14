-- 🔄 SYNC AUTH.USERS TO PUBLIC.USERS
-- This script syncs authenticated users to the public users table

-- First, let's see the auth.users data we need to sync
-- Note: This is what we have in auth.users that needs to be in public.users:

-- Users to sync:
-- 1. heinrich@matanuska.com (Heinrich Nel) - Role: driver
-- 2. www.hjnel@gmail.com (Admin) - Role: admin  
-- 3. heinrich@matanuska.co.zw (Heinrich Nel) - Role: driver
-- 4. nikkiekriel@gmail.com (Nikkie) - Role: driver
-- 5. heinnell64@gmail.com (Heinrich Nel) - Role: driver
-- 6. nikkie@gmail.com (Nikkie) - Role: driver
-- 7. heinrich@matanuska.co.zc (heinrich) - Role: driver
-- 8. heinnell64@gmail.co (heinnell) - Role: driver
-- 9. john@gmail.com (JohnNolen) - Role: driver ⭐ THE KEY ONE!

-- Insert users from auth data into public.users table
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
-- Heinrich Nel (driver)
('b4c0f491-b3f2-4b48-8447-cab1610999e8', 'heinrich@matanuska.com', 'Heinrich Nel', 'driver', '17ed751d-9c45-4cbb-9ccc-50607c151d43', true, '2025-10-09 14:24:41.598917+00', NOW()),

-- Admin user
('a46e2a06-a773-45db-b060-d51bf151c587', 'www.hjnel@gmail.com', 'Admin User', 'admin', '17ed751d-9c45-4cbb-9ccc-50607c151d43', true, '2025-09-27 12:59:17.890902+00', NOW()),

-- Heinrich Nel (driver - second account)
('7d3cdfb1-b7e9-4dec-8671-3bf7e223dc0c', 'heinrich@matanuska.co.zw', 'Heinrich Nel', 'driver', '17ed751d-9c45-4cbb-9ccc-50607c151d43', true, '2025-10-09 08:23:01.778004+00', NOW()),

-- Nikkie (driver)
('c64ff1f7-d317-4f6b-9bb3-8dd93728984b', 'nikkiekriel@gmail.com', 'Nikkie', 'driver', '17ed751d-9c45-4cbb-9ccc-50607c151d43', true, '2025-10-10 05:27:56.014534+00', NOW()),

-- Heinrich Nel (driver - third account)
('1810fcd6-d65c-48ed-a680-db647117e984', 'heinnell64@gmail.com', 'Heinrich Nel', 'driver', '17ed751d-9c45-4cbb-9ccc-50607c151d43', true, '2025-10-09 14:11:28.447711+00', NOW()),

-- Nikkie (driver - second account)
('720ea10c-5328-4821-a8f3-f710a0d176f8', 'nikkie@gmail.com', 'Nikkie', 'driver', '17ed751d-9c45-4cbb-9ccc-50607c151d43', true, '2025-10-13 15:46:12.900953+00', NOW()),

-- heinrich (driver)
('5d48cad9-b561-402f-ac10-fda2761076ee', 'heinrich@matanuska.co.zc', 'heinrich', 'driver', '17ed751d-9c45-4cbb-9ccc-50607c151d43', true, '2025-10-14 12:36:20.25065+00', NOW()),

-- heinnell (driver)
('6f64a796-e52f-4ca0-a8cd-40a9c854057b', 'heinnell64@gmail.co', 'heinnell', 'driver', '17ed751d-9c45-4cbb-9ccc-50607c151d43', true, '2025-10-14 12:01:45.051262+00', NOW()),

-- ⭐ JOHN NOLEN (THE KEY DRIVER) ⭐
('5e5ebf46-d35f-4dc4-9025-28fdf81059fd', 'john@gmail.com', 'John Nolen', 'driver', '17ed751d-9c45-4cbb-9ccc-50607c151d43', true, '2025-10-14 13:05:39.667588+00', NOW())

ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Verify the sync worked
SELECT 
  id, 
  full_name, 
  email, 
  role,
  CASE WHEN id = '5e5ebf46-d35f-4dc4-9025-28fdf81059fd' THEN '⭐ KEY DRIVER' ELSE '' END as notes
FROM public.users 
ORDER BY 
  CASE WHEN id = '5e5ebf46-d35f-4dc4-9025-28fdf81059fd' THEN 0 ELSE 1 END,
  full_name;