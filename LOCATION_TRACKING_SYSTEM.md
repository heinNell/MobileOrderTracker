# Complete Location Tracking System

## Overview

This document explains the complete location tracking system that updates both the `driver_locations` table (for history) and the `orders` table (for real-time tracking).

## Architecture

### 1. **Mobile App** → Sends Location Updates

```javascript
// LocationService.js
await locationService.sendImmediateLocationUpdate();
```

### 2. **driver_locations Table** → Stores Location History

```sql
INSERT INTO driver_locations (
    driver_id,
    order_id,
    latitude,
    longitude,
    location,  -- JSONB with {lat, lng}
    timestamp,
    ...
)
```

### 3. **Trigger** → Auto-Updates Orders Table

```sql
-- Trigger: trigger_update_order_with_driver_location
-- Fires AFTER INSERT/UPDATE on driver_locations
-- Updates orders.last_driver_location with latest position
```

### 4. **orders Table** → Shows Current Driver Position

```sql
UPDATE orders
SET last_driver_location = {
    driver_id,
    latitude,
    longitude,
    timestamp,
    ...
}
WHERE id = order_id;
```

## Database Schema

### driver_locations Table (History)

```sql
CREATE TABLE driver_locations (
    id UUID PRIMARY KEY,
    driver_id UUID NOT NULL,              -- References users(id)
    order_id UUID,                         -- References orders(id), can be NULL
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    location JSONB,                        -- {lat: -25.xxx, lng: 28.xxx}
    accuracy NUMERIC,
    accuracy_meters NUMERIC,
    speed NUMERIC,
    speed_kmh NUMERIC,
    heading NUMERIC,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_manual_update BOOLEAN,
    notes TEXT
);

-- NO unique constraint - allows multiple records per driver
-- Indexes for efficient queries
CREATE INDEX idx_driver_locations_driver_id_timestamp
ON driver_locations(driver_id, timestamp DESC);

CREATE INDEX idx_driver_locations_order_id_timestamp
ON driver_locations(order_id, timestamp DESC);
```

### orders Table (Current Status)

```sql
ALTER TABLE orders ADD COLUMN last_driver_location JSONB;
ALTER TABLE orders ADD COLUMN geometry_location GEOMETRY(POINT, 4326);

-- Structure of last_driver_location JSONB:
{
    "driver_id": "uuid",
    "latitude": -25.8080768,
    "longitude": 28.1935872,
    "location": {"lat": -25.8080768, "lng": 28.1935872},
    "accuracy": 980.55,
    "accuracy_meters": 980.55,
    "speed": null,
    "speed_kmh": null,
    "heading": null,
    "timestamp": "2025-10-15T10:21:19.177Z",
    "updated_at": "2025-10-15T10:21:19.552Z"
}

-- Indexes for queries
CREATE INDEX idx_orders_last_driver_location
ON orders USING GIN(last_driver_location);

CREATE INDEX idx_orders_geometry_location
ON orders USING GIST(geometry_location);
```

## Data Flow

### When Driver Sends Location Update:

1. **Mobile App**

   ```javascript
   LocationService.sendImmediateLocationUpdate()
   ↓
   Validates coordinates
   ↓
   Prepares location data
   ↓
   Supabase.upsert('driver_locations', data)
   ```

2. **Database - driver_locations INSERT**

   ```sql
   INSERT INTO driver_locations (
       driver_id: '5e5ebf46-d35f-4dc4-9025-28fdf81059fd',
       order_id: 'dc26b6ce-49e3-4178-a97c-2460cd564b29',
       latitude: -25.8080768,
       longitude: 28.1935872,
       timestamp: '2025-10-15T10:21:19.177Z'
   )
   ```

3. **Trigger Fires Automatically**

   ```sql
   trigger_update_order_with_driver_location
   ↓
   Checks if order_id IS NOT NULL
   ↓
   Updates orders table
   ```

4. **Database - orders UPDATE**

   ```sql
   UPDATE orders
   SET
       last_driver_location = {full location data},
       geometry_location = ST_MakePoint(lng, lat),
       updated_at = NOW()
   WHERE id = order_id
   ```

5. **Dashboard Updates in Real-Time**
   ```javascript
   // Dashboard subscribes to orders table changes
   supabase
     .channel("orders")
     .on(
       "postgres_changes",
       { event: "UPDATE", schema: "public", table: "orders" },
       (payload) => updateMap(payload.new.last_driver_location)
     );
   ```

## Querying Location Data

### Get Latest Location for a Driver

```sql
-- From driver_locations (most recent from history)
SELECT * FROM driver_locations
WHERE driver_id = 'xxx'
ORDER BY timestamp DESC
LIMIT 1;

-- Or use the view
SELECT * FROM v_driver_latest_locations
WHERE driver_id = 'xxx';
```

### Get Current Driver Location for an Order

```sql
-- From orders table (always current)
SELECT
    order_number,
    status,
    last_driver_location->>'latitude' as lat,
    last_driver_location->>'longitude' as lng,
    last_driver_location->>'timestamp' as last_update
FROM orders
WHERE id = 'order-id';

-- Or use the view
SELECT * FROM v_orders_with_driver_location
WHERE id = 'order-id';
```

### Get Location History for an Order

```sql
-- All locations during this order
SELECT
    timestamp,
    latitude,
    longitude,
    speed_kmh,
    accuracy_meters
FROM driver_locations
WHERE order_id = 'order-id'
ORDER BY timestamp ASC;
```

### Find Orders Near a Location

```sql
-- Using PostGIS
SELECT
    order_number,
    status,
    ST_Distance(
        geometry_location,
        ST_SetSRID(ST_MakePoint(28.1935872, -25.8080768), 4326)
    ) as distance_meters
FROM orders
WHERE geometry_location IS NOT NULL
  AND ST_DWithin(
      geometry_location,
      ST_SetSRID(ST_MakePoint(28.1935872, -25.8080768), 4326),
      5000  -- 5km radius
  )
ORDER BY distance_meters;
```

## Views for Easy Access

### v_driver_latest_locations

Shows the most recent location for each driver:

```sql
SELECT * FROM v_driver_latest_locations;
-- Returns: driver_id, latitude, longitude, timestamp, etc.
```

### v_orders_with_driver_location

Shows orders with their driver's current location:

```sql
SELECT * FROM v_orders_with_driver_location
WHERE status IN ('in_transit', 'in_progress');
-- Returns: All order fields + driver location fields
```

## Benefits of This Design

### ✅ Advantages

1. **Location History**

   - Track complete driver routes
   - Analyze delivery patterns
   - Provide proof of delivery path
   - Audit trail for disputes

2. **Real-Time Updates**

   - Orders table always has latest location
   - No need to query history for current position
   - Fast dashboard updates

3. **Efficient Queries**

   - History queries use `driver_locations`
   - Current location queries use `orders`
   - Optimized indexes for both use cases

4. **Data Integrity**

   - Trigger ensures orders are always updated
   - No manual sync needed
   - Automatic handling via database

5. **Scalability**
   - Can archive old location history
   - Orders table stays small
   - Views provide convenient access

## Performance Considerations

### Storage

- **10 drivers** × **100 updates/day** = **1,000 records/day**
- At **1KB per record** = **~1MB/day** = **~365MB/year**
- Very manageable for most systems

### Query Performance

- Indexes on `(driver_id, timestamp)` make history queries fast
- JSONB indexes on orders make real-time queries instant
- Spatial indexes enable location-based searches

### Optimization Options

1. **Archive Old Data**

   ```sql
   -- Move old location data to archive table
   INSERT INTO driver_locations_archive
   SELECT * FROM driver_locations
   WHERE created_at < NOW() - INTERVAL '90 days';

   DELETE FROM driver_locations
   WHERE created_at < NOW() - INTERVAL '90 days';
   ```

2. **Partition Tables**
   ```sql
   -- Partition by month for better performance
   CREATE TABLE driver_locations_2025_10
   PARTITION OF driver_locations
   FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
   ```

## Testing

### Test Location Update

```javascript
// Mobile app
await locationService.sendImmediateLocationUpdate();
```

### Verify in Database

```sql
-- Check driver_locations (should have new record)
SELECT * FROM driver_locations
WHERE driver_id = 'your-driver-id'
ORDER BY timestamp DESC
LIMIT 5;

-- Check orders (should have updated last_driver_location)
SELECT
    order_number,
    last_driver_location
FROM orders
WHERE assigned_driver_id = 'your-driver-id'
  AND status NOT IN ('completed', 'cancelled');
```

## Troubleshooting

### Location Not Updating Orders

1. Check if trigger exists:

   ```sql
   SELECT * FROM information_schema.triggers
   WHERE trigger_name = 'trigger_update_order_with_driver_location';
   ```

2. Check trigger function:

   ```sql
   SELECT prosrc FROM pg_proc
   WHERE proname = 'update_order_with_driver_location';
   ```

3. Check if order_id is being sent:
   ```sql
   SELECT order_id FROM driver_locations
   ORDER BY created_at DESC LIMIT 10;
   ```

### Unique Constraint Errors

```sql
-- Verify constraint is removed
SELECT conname FROM pg_constraint
WHERE conrelid = 'driver_locations'::regclass;

-- Should NOT show: uq_driver_locations_driver_id
```

## Migration Checklist

- [ ] Run `20251015120000_comprehensive_location_fix.sql`
- [ ] Verify indexes created
- [ ] Verify trigger created
- [ ] Test location update from mobile app
- [ ] Verify orders table updates automatically
- [ ] Check dashboard shows real-time locations
- [ ] Test location history queries
- [ ] Verify views work correctly

## Summary

This complete location system provides:

- ✅ **Full location history** in `driver_locations`
- ✅ **Real-time tracking** in `orders.last_driver_location`
- ✅ **Automatic synchronization** via database trigger
- ✅ **Efficient queries** with optimized indexes
- ✅ **Easy access** via convenient views
- ✅ **Spatial capabilities** with PostGIS integration

The driver only needs to send location updates, and the database automatically keeps both history and current position updated!
