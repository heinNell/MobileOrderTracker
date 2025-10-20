# 🔧 Geofence Selection Troubleshooting Guide

## ✅ Issue Fixed!

The order creation form was looking for geofences in the wrong table.

**Problem:**

- Geofences page creates records in `enhanced_geofences` table
- Order form was trying to fetch from `geofences_api` (doesn't exist)
- Then falling back to old `geofences` table (wrong table)

**Solution Applied:**

- Updated `EnhancedOrderForm.tsx` to fetch from `enhanced_geofences` table
- The form now correctly queries: `geofence_name`, `center_latitude`, `center_longitude`, `radius_meters`, `geofence_type`

---

## 📋 Quick Verification Steps

### Step 1: Verify Geofences Exist in Database

Run this SQL in Supabase SQL Editor:

```sql
-- Check if geofences exist
SELECT
  id,
  geofence_name,
  geofence_type,
  center_latitude,
  center_longitude,
  is_active,
  tenant_id,
  created_at
FROM enhanced_geofences
WHERE is_active = true
ORDER BY created_at DESC;
```

**Expected Result:** You should see your geofences listed.

---

### Step 2: Check Your Browser Console

1. Open dashboard: `http://localhost:3000/dashboard/orders`
2. Click **"Create New Order"**
3. Open browser Developer Tools (F12)
4. Click the **Console** tab
5. Look for these messages:

```
✅ GOOD:
"Fetching geofences for tenant <uuid>"
"Loaded X geofences from enhanced_geofences table"

❌ BAD:
"User has no tenant_id"
"Error fetching geofences: ..."
```

---

### Step 3: Test Geofence Selection in Order Form

1. Navigate to: `http://localhost:3000/dashboard/orders`
2. Click **"Create New Order"**
3. Go to the **"Locations"** tab in the modal
4. Click the **"Loading Location"** dropdown

**What You Should See:**

- A dropdown list populated with all your active geofences
- Each entry showing: `[Geofence Name]`
- Click one to select it

---

## 🐛 If Geofences Still Don't Appear

### Issue 1: No Geofences in Database

**Symptoms:** SQL query returns 0 rows

**Solution:** Create geofences first

1. Navigate to: `http://localhost:3000/dashboard/geofences`
2. Click **"+ Add Geofence"**
3. Fill in at minimum:
   - Geofence Name: "LA Warehouse"
   - Type: "Loading Point"
   - Latitude: `33.9416`
   - Longitude: `-118.4085`
   - Radius: `100` meters
4. Click **"Create Geofence"**
5. Verify it appears in the list

---

### Issue 2: Geofences Marked as Inactive

**Symptoms:** Geofences exist but SQL query with `is_active = true` returns nothing

**Solution:** Activate geofences

```sql
-- Check inactive geofences
SELECT id, geofence_name, is_active
FROM enhanced_geofences
WHERE is_active = false;

-- Activate all geofences (if needed)
UPDATE enhanced_geofences
SET is_active = true
WHERE is_active = false;
```

---

### Issue 3: Tenant ID Mismatch

**Symptoms:** Geofences exist but don't show for your user

**Solution:** Verify tenant IDs match

```sql
-- Check your user's tenant_id
SELECT id, email, tenant_id, role
FROM users
WHERE email = 'your-email@example.com';

-- Check geofences tenant_id
SELECT id, geofence_name, tenant_id
FROM enhanced_geofences;

-- If mismatch, update geofences to match your tenant_id
UPDATE enhanced_geofences
SET tenant_id = (
  SELECT tenant_id
  FROM users
  WHERE email = 'your-email@example.com'
)
WHERE tenant_id IS NULL OR tenant_id != (
  SELECT tenant_id
  FROM users
  WHERE email = 'your-email@example.com'
);
```

---

### Issue 4: RLS (Row Level Security) Blocking Access

**Symptoms:** Console shows "permission denied" or "no rows returned"

**Solution:** Verify RLS policies

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'enhanced_geofences';

-- Check existing policies
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'enhanced_geofences';

-- If policies are missing, run enhanced-preconfiguration-system.sql
```

**Ensure this policy exists:**

```sql
CREATE POLICY "Users can view geofences in their tenant" ON enhanced_geofences
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );
```

---

## 🔍 Detailed Debugging

### Enable Verbose Logging

Open `EnhancedOrderForm.tsx` and the console will automatically log:

```javascript
// These logs are already in the code:
console.log("Fetching geofences for tenant", userData.tenant_id);
console.log("Loaded X geofences from enhanced_geofences table");
console.error("Error fetching geofences:", error);
```

### Check Network Tab

1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Filter by: `enhanced_geofences`
4. Open order creation form
5. Look for API call to Supabase
6. Check:
   - **Status:** Should be `200 OK`
   - **Response:** Should show array of geofences
   - **Preview:** Should show JSON with geofence data

---

## 📊 Test Query in Supabase

Run this exact query that the form uses:

```sql
SELECT
  id,
  geofence_name,
  center_latitude,
  center_longitude,
  radius_meters,
  geofence_type
FROM enhanced_geofences
WHERE tenant_id = 'YOUR_TENANT_ID_HERE'  -- Replace with your tenant_id
  AND is_active = true
ORDER BY geofence_name;
```

**This should return your geofences.** If it doesn't:

1. Remove `tenant_id` filter to see all geofences
2. Remove `is_active` filter to see inactive ones
3. Check if table exists: `\dt enhanced_geofences`

---

## ✅ Verification Checklist

- [ ] `enhanced_geofences` table exists in database
- [ ] Geofences have been created via `/dashboard/geofences` page
- [ ] Geofences have `is_active = true`
- [ ] Your user has a valid `tenant_id`
- [ ] Geofences have matching `tenant_id`
- [ ] RLS policies are configured correctly
- [ ] Browser console shows "Loaded X geofences" message
- [ ] Dropdown in order form shows geofence options
- [ ] Can select geofence and it fills in the form

---

## 🎯 Expected Behavior After Fix

1. **Navigate to Orders:** `http://localhost:3000/dashboard/orders`
2. **Click:** "Create New Order" button
3. **Click:** "Locations" tab in modal
4. **Click:** "Loading Location" dropdown
5. **See:** List of all your active geofences
6. **Select:** Any geofence from the list
7. **Result:**
   - Geofence name populates
   - Coordinates auto-fill
   - Address auto-fills (if configured)
   - Contact auto-fills (if linked)

---

## 🆘 Still Having Issues?

### Check the Code Change

Verify the fix was applied in `/dashboard/app/components/EnhancedOrderForm.tsx`:

```typescript
// Should now say "enhanced_geofences" (line ~172)
const { data: geofences, error } = await supabase
  .from("enhanced_geofences") // ✅ Correct!
  .select(
    "id, geofence_name, center_latitude, center_longitude, radius_meters, geofence_type"
  )
  .eq("tenant_id", userData.tenant_id)
  .eq("is_active", true)
  .order("geofence_name");
```

**NOT:**

```typescript
.from("geofences_api")  // ❌ Old/Wrong
.from("geofences")      // ❌ Old/Wrong
```

---

## 🔄 Restart Dashboard (If Needed)

```bash
cd /workspaces/MobileOrderTracker/dashboard
npm run dev
```

Then test again at: `http://localhost:3000/dashboard/orders`

---

## ✨ Success Indicators

You'll know it's working when:

1. **Console Log:**

   ```
   Fetching geofences for tenant abc-123-def
   Loaded 3 geofences from enhanced_geofences table
   ```

2. **Dropdown Shows:**

   ```
   Loading Location: [Select...]
   ▼
   ├─ LA Warehouse
   ├─ SF Distribution Center
   └─ NY Loading Dock
   ```

3. **After Selection:**
   ```
   Loading Location: LA Warehouse
   Latitude: 33.9416
   Longitude: -118.4085
   Radius: 100 meters
   ```

---

**The issue has been fixed in the code. The form now correctly queries the `enhanced_geofences` table!** 🎉

If you're still experiencing issues after verifying the steps above, please share:

1. Browser console logs
2. SQL query results from Step 1
3. Any error messages you see
