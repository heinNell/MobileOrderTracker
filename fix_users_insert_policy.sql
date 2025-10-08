-- Fix for users insert policy
DO $$
BEGIN
  -- Check if policy already exists and drop if needed
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Service role can insert users'
  ) THEN
    DROP POLICY "Service role can insert users" ON public.users;
  END IF;
  
  -- Create correct policy with WITH CHECK
  CREATE POLICY "Service role can insert users" ON public.users
    FOR INSERT TO authenticated
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
  
  -- Check if admin policy already exists and drop if needed
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Admin users can insert users'
  ) THEN
    DROP POLICY "Admin users can insert users" ON public.users;
  END IF;
  
  -- Create correct admin policy with WITH CHECK
  CREATE POLICY "Admin users can insert users" ON public.users
    FOR INSERT TO authenticated
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');
    
  -- Make sure RLS is enabled
  ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
END $$;
