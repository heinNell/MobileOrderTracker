-- Check the definition of sync_user_from_auth function
SELECT
    'Function Definition' as section,
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'sync_user_from_auth';

-- Also check for any other functions that might be modifying tenant_id
SELECT
    'All Functions that might affect users table' as section,
    proname as function_name,
    prosrc as source_code
FROM pg_proc
WHERE prosrc LIKE '%tenant_id%'
    OR prosrc LIKE '%users%'
ORDER BY proname;
