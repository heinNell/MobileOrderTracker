[
  {
    "Extension Name": "postgis",
    "Version": "3.3.7"
  },
  {
    "Extension Name": "uuid-ossp",
    "Version": "1.1"
  }
]

#### /workspaces/MobileOrderTracker/supabase/check_actual_schema.sql
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
    "column_name": "subdomain",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  }
]

[
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "column_name": "tenant_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "column_name": "order_number",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "column_name": "sku",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "column_name": "qr_code_data",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "column_name": "qr_code_signature",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "column_name": "qr_code_expires_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "column_name": "loading_point_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "column_name": "loading_point_address",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "column_name": "loading_point_location",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "column_name": "unloading_point_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "column_name": "unloading_point_address",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "column_name": "unloading_point_location",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "column_name": "assigned_driver_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "column_name": "created_by",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  }
]

[
  {
    "schemaname": "public",
    "tablename": "map_locations",
    "policyname": "Users can insert their own map locations"
  },
  {
    "schemaname": "public",
    "tablename": "map_locations",
    "policyname": "Users can read their own map locations"
  },
  {
    "schemaname": "public",
    "tablename": "map_locations",
    "policyname": "Users can update their own map locations"
  },
  {
    "schemaname": "public",
    "tablename": "map_routes",
    "policyname": "Users can insert their own routes"
  },
  {
    "schemaname": "public",
    "tablename": "map_routes",
    "policyname": "Users can read their own routes"
  },
  {
    "schemaname": "public",
    "tablename": "map_routes",
    "policyname": "Users can update their own routes"
  },
  {
    "schemaname": "public",
    "tablename": "qr_scans",
    "policyname": "Allow inserts for authenticated users"
  }
]