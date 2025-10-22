-- Check the ACTUAL structure of your orders table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'orders'
ORDER BY ordinal_position;

-- Check users/profiles table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('users', 'profiles')
ORDER BY table_name, ordinal_position;

-- Check tenants table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'tenants'
ORDER BY ordinal_position;
[
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  }
]