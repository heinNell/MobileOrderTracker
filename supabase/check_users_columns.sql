-- Check actual users table columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY ordinal_position;
[
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "column_name": "full_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "column_name": "phone",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "column_name": "role",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "column_name": "tenant_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "column_name": "last_location",
    "data_type": "USER-DEFINED",
    "is_nullable": "YES"
  },
  {
    "column_name": "last_location_update",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  }
]