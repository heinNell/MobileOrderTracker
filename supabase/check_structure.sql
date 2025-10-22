-- Check Database Structure
-- Run this to see what tables and columns actually exist

-- Check if tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'tenants', 'orders', 'location_updates')
ORDER BY table_name;

-- Check columns in users table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY ordinal_position;

-- Check columns in orders table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'orders'
ORDER BY ordinal_position;

-- Check existing RLS policies
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
[
  {
    "schemaname": "public",
    "tablename": "driver_credentials",
    "policyname": "allow_all_authenticated_all_driver_credentials"
  },
  {
    "schemaname": "public",
    "tablename": "driver_credentials",
    "policyname": "svc_only_credentials_write"
  },
  {
    "schemaname": "public",
    "tablename": "driver_locations",
    "policyname": "Admins can read tenant location updates"
  },
  {
    "schemaname": "public",
    "tablename": "driver_locations",
    "policyname": "Drivers can insert own location updates"
  },
  {
    "schemaname": "public",
    "tablename": "driver_locations",
    "policyname": "Drivers can read own location updates"
  },
  {
    "schemaname": "public",
    "tablename": "driver_locations",
    "policyname": "Users can read tenant driver locations"
  },
  {
    "schemaname": "public",
    "tablename": "drivers",
    "policyname": "allow_all_authenticated_all_drivers"
  },
  {
    "schemaname": "public",
    "tablename": "drivers",
    "policyname": "authenticated_read_drivers"
  },
  {
    "schemaname": "public",
    "tablename": "drivers",
    "policyname": "drivers_tenant_isolation_delete"
  },
  {
    "schemaname": "public",
    "tablename": "drivers",
    "policyname": "drivers_tenant_isolation_insert"
  },
  {
    "schemaname": "public",
    "tablename": "drivers",
    "policyname": "drivers_tenant_isolation_select"
  },
  {
    "schemaname": "public",
    "tablename": "drivers",
    "policyname": "drivers_tenant_isolation_update"
  },
  {
    "schemaname": "public",
    "tablename": "drivers",
    "policyname": "drivers_update_own"
  },
  {
    "schemaname": "public",
    "tablename": "drivers",
    "policyname": "service_role_full_access_drivers"
  },
  {
    "schemaname": "public",
    "tablename": "drivers",
    "policyname": "svc_drivers_all"
  },
  {
    "schemaname": "public",
    "tablename": "enhanced_geofences",
    "policyname": "allow_all_delete"
  },
  {
    "schemaname": "public",
    "tablename": "enhanced_geofences",
    "policyname": "allow_all_insert"
  },
  {
    "schemaname": "public",
    "tablename": "enhanced_geofences",
    "policyname": "allow_all_select"
  },
  {
    "schemaname": "public",
    "tablename": "enhanced_geofences",
    "policyname": "allow_all_update"
  },
  {
    "schemaname": "public",
    "tablename": "geofences_backup",
    "policyname": "allow_all_authenticated_all_geofences"
  },
  {
    "schemaname": "public",
    "tablename": "geofences_backup",
    "policyname": "geofences_delete_authenticated"
  },
  {
    "schemaname": "public",
    "tablename": "geofences_backup",
    "policyname": "geofences_insert_authenticated"
  },
  {
    "schemaname": "public",
    "tablename": "geofences_backup",
    "policyname": "geofences_read_authenticated"
  },
  {
    "schemaname": "public",
    "tablename": "geofences_backup",
    "policyname": "geofences_select_authenticated"
  },
  {
    "schemaname": "public",
    "tablename": "geofences_backup",
    "policyname": "geofences_update_authenticated"
  },
  {
    "schemaname": "public",
    "tablename": "geofences_backup",
    "policyname": "geofences_write_authenticated"
  },
  {
    "schemaname": "public",
    "tablename": "geofences_backup",
    "policyname": "tenant_geofences_select"
  },
  {
    "schemaname": "public",
    "tablename": "load_activations",
    "policyname": "Drivers can insert their load activations"
  },
  {
    "schemaname": "public",
    "tablename": "load_activations",
    "policyname": "allow_all_authenticated_all_load_activations"
  },
  {
    "schemaname": "public",
    "tablename": "load_activations",
    "policyname": "delete_own_rows"
  },
  {
    "schemaname": "public",
    "tablename": "load_activations",
    "policyname": "insert_only_own_driver"
  },
  {
    "schemaname": "public",
    "tablename": "load_activations",
    "policyname": "select_own_rows"
  },
  {
    "schemaname": "public",
    "tablename": "load_activations",
    "policyname": "update_own_rows"
  },
  {
    "schemaname": "public",
    "tablename": "order_contacts",
    "policyname": "Enable delete for authenticated users"
  },
  {
    "schemaname": "public",
    "tablename": "order_contacts",
    "policyname": "Enable insert for authenticated users"
  },
  {
    "schemaname": "public",
    "tablename": "order_contacts",
    "policyname": "Enable read access for authenticated users"
  },
  {
    "schemaname": "public",
    "tablename": "order_contacts",
    "policyname": "Enable update for authenticated users"
  },
  {
    "schemaname": "public",
    "tablename": "order_templates",
    "policyname": "Enable delete for authenticated users"
  },
  {
    "schemaname": "public",
    "tablename": "order_templates",
    "policyname": "Enable insert for authenticated users"
  },
  {
    "schemaname": "public",
    "tablename": "order_templates",
    "policyname": "Enable read access for authenticated users"
  },
  {
    "schemaname": "public",
    "tablename": "order_templates",
    "policyname": "Enable update for authenticated users"
  },
  {
    "schemaname": "public",
    "tablename": "qr_codes",
    "policyname": "allow_all_authenticated_all_qr_codes"
  }
]