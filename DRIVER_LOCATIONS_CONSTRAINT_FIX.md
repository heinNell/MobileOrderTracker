# Driver Locations Unique Constraint Fix

## Problem

Error: `duplicate key value violates unique constraint "uq_driver_locations_driver_id"`

The `driver_locations` table has a unique constraint that only allows ONE location record per driver. This conflicts with the location tracking feature which needs to store multiple location updates over time.

## Root Cause

Someone created a unique index/constraint on the `driver_id` column, which prevents storing location history.

## Solution Options

### **Option 1: Remove the Unique Constraint (RECOMMENDED)**

This allows storing **location history** - multiple location records per driver over time.

**Pros:**

- ✅ Track driver movement history
- ✅ Analyze routes taken
- ✅ Show location timeline
- ✅ Better for audit and compliance

**Cons:**

- ❌ Database grows larger over time
- ❌ Need to query latest location with filters

**How to Apply:**

```sql
-- Run fix-driver-locations-constraint.sql in Supabase SQL Editor
-- This will drop the unique constraint
```

**Code Changes:**

- ✅ Already updated `LocationService.js` to use `upsert()`
- ✅ Works with both constraint patterns

---

### **Option 2: Keep Constraint, Use Upsert (Alternative)**

This keeps only the **latest location** per driver.

**Pros:**

- ✅ Smaller database size
- ✅ Simple queries (no need to filter by latest)
- ✅ Fast lookups

**Cons:**

- ❌ No location history
- ❌ Can't analyze routes
- ❌ Can't show timeline

**How to Apply:**

- ✅ Code already updated to use `upsert()`
- No SQL changes needed
- The unique constraint will work with upsert

---

## Recommended Approach

**Use Option 1** - Remove the constraint and keep location history.

### Why?

1. **Location tracking needs history** for:

   - Route visualization
   - Delivery proof
   - Dispute resolution
   - Performance analysis

2. **Database size is manageable:**

   - 10 drivers × 100 updates/day = 1000 records/day
   - At 1KB per record = ~1MB/day = ~365MB/year
   - This is very reasonable

3. **You can still get latest location easily:**
   ```sql
   SELECT * FROM driver_locations
   WHERE driver_id = 'xxx'
   ORDER BY timestamp DESC
   LIMIT 1;
   ```

---

## Implementation Steps

### Step 1: Run SQL Fix (Option 1)

```bash
# In Supabase SQL Editor, run:
fix-driver-locations-constraint.sql
```

This will:

- ✅ Drop the unique constraint
- ✅ Create an optimized index for queries
- ✅ Allow multiple location records per driver

### Step 2: Code Changes (Already Done)

The `LocationService.js` has been updated to use `upsert()` which works with both approaches:

- ✅ If constraint exists: Updates existing record
- ✅ If no constraint: Inserts new record

### Step 3: Test

1. Open mobile app
2. Send location update - should work without error
3. Send another location update - should work
4. Check database - should see multiple records per driver

---

## Database Schema Recommendations

### Keep Location History Table:

```sql
CREATE TABLE driver_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- ... other fields
);

-- Index for efficient queries
CREATE INDEX idx_driver_locations_driver_timestamp
ON driver_locations(driver_id, timestamp DESC);
```

### Optional: Create Latest Location View:

```sql
CREATE VIEW driver_latest_locations AS
SELECT DISTINCT ON (driver_id) *
FROM driver_locations
ORDER BY driver_id, timestamp DESC;
```

This gives you:

- ✅ Full history in main table
- ✅ Easy access to latest location via view
- ✅ Best of both worlds

---

## Testing

### Test Location Updates:

```javascript
// Mobile app - should work multiple times
await locationService.sendImmediateLocationUpdate();
await locationService.sendImmediateLocationUpdate(); // Should not error
```

### Query Location History:

```sql
-- Get all locations for a driver
SELECT * FROM driver_locations
WHERE driver_id = '5e5ebf46-d35f-4dc4-9025-28fdf81059fd'
ORDER BY timestamp DESC;

-- Get latest location
SELECT * FROM driver_locations
WHERE driver_id = '5e5ebf46-d35f-4dc4-9025-28fdf81059fd'
ORDER BY timestamp DESC
LIMIT 1;
```

---

## Summary

✅ **Recommended:** Remove unique constraint, keep location history
✅ **Code Updated:** LocationService now uses `upsert()` for compatibility
✅ **Next Step:** Run `fix-driver-locations-constraint.sql` in Supabase

The location tracking will work perfectly after applying the SQL fix!
