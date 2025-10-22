-- Check actual orders table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'orders'
ORDER BY ordinal_position;
[
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()"
  },
  {
    "column_name": "assigned_driver_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "order_status",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "column_name": "tenant_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": "'pending'::text"
  }
]