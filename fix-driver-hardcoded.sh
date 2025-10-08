#!/bin/bash

echo "🔧 Starting driver database fix with hardcoded credentials..."

# Hardcoded values
SUPABASE_URL="https://liagltqpeilbswuqcahp.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpYWdsdHFwZWlsYnN3dXFjYWhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM1NzE4NSwiZXhwIjoyMDczOTMzMTg1fQ.dtEl-YMJZ-YmEaS9B7Loy7I3bRcf-2sHjpHRF8sCD8o"

echo "Using Supabase URL: $SUPABASE_URL"

# Create SQL file for the policy
echo "Creating SQL policy file..."
cat > fix_users_insert_policy.sql << 'EOSQL'
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
EOSQL

# Apply SQL policy using REST API
echo "Applying RLS policies via REST API..."
curl -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  --data @- << EOF
{"sql": "$(cat fix_users_insert_policy.sql | tr '\n' ' ')"}
EOF

echo -e "\n✅ Database fix completed!"
echo "You should now be able to create driver accounts."
