-- Drop existing policies if they exist
DROP POLICY
IF EXISTS "Service role can insert users" ON public.users;
DROP POLICY
IF EXISTS "Admin users can insert users" ON public.users;

-- Create correct policies with WITH CHECK
CREATE POLICY "Service role can insert users" ON public.users
  FOR
INSERT TO authenticated
  WITH CHECK (
auth.jwt()
->>
'role'
= 'service_role');

CREATE POLICY "Admin users can insert users" ON public.users
  FOR
INSERT TO authenticated
  WITH CHECK (
auth.jwt()
->>
'role'
= 'admin');

-- Enable RLS on users table if not already enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
