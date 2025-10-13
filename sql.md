# Verifying Supabase Database Schema

To verify if the schema, indexes, and tables exist for your order detail page, follow these steps:

## 1. **Check Tables and Schema via Supabase Dashboard**

Go to your Supabase project dashboard:
- **Database** → **Tables** → Check for:
  - `orders`
  - `status_updates`
  - `incidents`
  - `driver_locations`
  - `users`
  - `notifications`

## 2. **Run SQL Queries to Verify Schema**

Execute these queries in the Supabase SQL Editor:

### Check if tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### Verify column structure for each table:

```sql
-- Orders table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'orders'
ORDER BY ordinal_position;

-- Status updates table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'status_updates'
ORDER BY ordinal_position;

-- Incidents table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'incidents'
ORDER BY ordinal_position;

-- Driver locations table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'driver_locations'
ORDER BY ordinal_position;

-- Notifications table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'notifications'
ORDER BY ordinal_position;
```
[
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "column_name": "order_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "column_name": "status",
    "data_type": "USER-DEFINED",
    "is_nullable": "NO"
  },
  {
    "column_name": "note",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "column_name": "created_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  }
]
## 3. **Check Foreign Key Relationships**

```sql
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
```

## 4. **Verify Indexes**

```sql
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

## 5. **Create Missing Schema (If Needed)**

Based on your code, here's the expected schema:

### Orders Table
```sql
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR NOT NULL UNIQUE,
    sku VARCHAR,
    status VARCHAR NOT NULL DEFAULT 'pending',
    assigned_driver_id UUID REFERENCES users(id),
    loading_point_name VARCHAR NOT NULL,
    loading_point_address TEXT NOT NULL,
    unloading_point_name VARCHAR NOT NULL,
    unloading_point_address TEXT NOT NULL,
    estimated_distance_km NUMERIC,
    estimated_duration_minutes INTEGER,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    contact_name VARCHAR,
    contact_phone VARCHAR,
    delivery_instructions TEXT,
    special_handling_instructions TEXT,
    transporter_supplier JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver ON orders(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
```

### Status Updates Table
```sql
CREATE TABLE IF NOT EXISTS status_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES users(id),
    status VARCHAR NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_updates_order ON status_updates(order_id);
CREATE INDEX IF NOT EXISTS idx_status_updates_created_at ON status_updates(created_at DESC);
```

### Incidents Table
```sql
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES users(id),
    title VARCHAR NOT NULL,
    description TEXT NOT NULL,
    severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_incidents_order ON incidents(order_id);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);
```

### Driver Locations Table
```sql
CREATE TABLE IF NOT EXISTS driver_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    location JSONB NOT NULL, -- {latitude: number, longitude: number}
    speed_kmh NUMERIC,
    accuracy_meters NUMERIC,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_locations_driver ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_order ON driver_locations(order_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_timestamp ON driver_locations(timestamp DESC);
```

### Notifications Table
```sql
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
```

## 6. **Enable Row Level Security (RLS)**

```sql
-- Enable RLS on all tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies (example for orders)
CREATE POLICY "Users can view orders assigned to them or created by them"
    ON orders FOR SELECT
    USING (auth.uid() = assigned_driver_id OR auth.uid() IN (
        SELECT id FROM users WHERE role = 'admin'
    ));
```

## 7. **Enable Realtime (for subscriptions)**

```sql
-- Enable realtime for tables used in subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE status_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE driver_locations;
```

## 8. **Quick Verification Script**

Run this comprehensive check:

```sql
DO $$
DECLARE
    tables_list TEXT[] := ARRAY['orders', 'status_updates', 'incidents', 'driver_locations', 'notifications', 'users'];
    tbl TEXT;
    missing_tables TEXT := '';
BEGIN
    FOREACH tbl IN ARRAY tables_list LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
            missing_tables := missing_tables || tbl || ', ';
        END IF;
    END LOOP;
    
    IF missing_tables != '' THEN
        RAISE NOTICE 'Missing tables: %', TRIM(TRAILING ', ' FROM missing_tables);
    ELSE
        RAISE NOTICE 'All required tables exist!';
    END IF;
END $$;
```

This will help you identify which components of your database schema are missing or need to be created!

I can see your database has 15 tables. To help you effectively, could you tell me what you're trying to accomplish? For example:

**Common tasks I can help with:**

1. **Schema exploration** - View table structures, columns, and data types
2. **Data querying** - Extract specific information from these tables
3. **Relationship mapping** - Understand how tables connect to each other
4. **Data analysis** - Generate reports or insights
5. **Migration/setup** - Create new tables or modify existing ones
6. **Performance optimization** - Index suggestions, query optimization

**Quick next steps you might want:**

```sql
-- See all columns for a specific table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'drivers'  -- or any table name
ORDER BY ordinal_position;

-- Check foreign key relationships
SELECT
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
```
[
  {
    "table_name": "profiles",
    "column_name": "tenant_id",
    "foreign_table_name": "tenants",
    "foreign_column_name": "id"
  },
  {
    "table_name": "qr_codes",
    "column_name": "order_id",
    "foreign_table_name": "orders",
    "foreign_column_name": "id"
  },
  {
    "table_name": "qr_codes",
    "column_name": "scanned_by",
    "foreign_table_name": "users",
    "foreign_column_name": "id"
  },
  {
    "table_name": "location_updates",
    "column_name": "order_id",
    "foreign_table_name": "orders",
    "foreign_column_name": "id"
  },
  {
    "table_name": "location_updates",
    "column_name": "driver_id",
    "foreign_table_name": "users",
    "foreign_column_name": "id"
  },
  {
    "table_name": "incidents",
    "column_name": "order_id",
    "foreign_table_name": "orders",
    "foreign_column_name": "id"
  },
  {
    "table_name": "incidents",
    "column_name": "driver_id",
    "foreign_table_name": "users",
    "foreign_column_name": "id"
  },
  {
    "table_name": "driver_locations",
    "column_name": "driver_id",
    "foreign_table_name": "users",
    "foreign_column_name": "id"
  },
  {
    "table_name": "driver_locations",
    "column_name": "order_id",
    "foreign_table_name": "orders",
    "foreign_column_name": "id"
  },
  {
    "table_name": "notifications",
    "column_name": "user_id",
    "foreign_table_name": "users",
    "foreign_column_name": "id"
  },
  {
    "table_name": "notifications",
    "column_name": "order_id",
    "foreign_table_name": "orders",
    "foreign_column_name": "id"
  },
  {
    "table_name": "orders",
    "column_name": "qr_code_id",
    "foreign_table_name": "qr_codes",
    "foreign_column_name": "id"
  },
  {
    "table_name": "users",
    "column_name": "tenant_id",
    "foreign_table_name": "tenants",
    "foreign_column_name": "id"
  },
  {
    "table_name": "orders",
    "column_name": "assigned_driver_id",
    "foreign_table_name": "users",
    "foreign_column_name": "id"
  },
  {
    "table_name": "status_updates",
    "column_name": "order_id",
    "foreign_table_name": "orders",
    "foreign_column_name": "id"
  },
  {
    "table_name": "driver_credentials",
    "column_name": "driver_id",
    "foreign_table_name": "drivers",
    "foreign_column_name": "id"
  },
  {
    "table_name": "orders",
    "column_name": "load_activated_by",
    "foreign_table_name": "users",
    "foreign_column_name": "id"
  },
  {
    "table_name": "load_activations",
    "column_name": "order_id",
    "foreign_table_name": "orders",
    "foreign_column_name": "id"
  },
  {
    "table_name": "load_activations",
    "column_name": "driver_id",
    "foreign_table_name": "users",
    "foreign_column_name": "id"
  }
]