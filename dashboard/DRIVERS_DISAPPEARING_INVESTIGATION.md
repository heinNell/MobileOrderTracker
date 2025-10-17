# 🔍 Drivers Disappearing Investigation

**Date:** October 17, 2025  
**Issue:** Drivers disappearing from driver list and orders after some time  
**Status:** 🔍 **INVESTIGATING**

---

## 🎯 Problem Statement

User reports that:

1. **Initially:** Driver assignment works correctly
2. **After some time:** Driver disappears from the driver list page
3. **Consequence:** Driver is also removed from associated orders

This suggests:

- Drivers are being filtered out (not displayed)
- OR drivers are being deactivated/deleted
- OR RLS policies are hiding drivers
- OR tenant_id relationships are breaking

---

## 🔍 Investigation Findings

### 1. Driver Fetching Query (Drivers Page)

**Location:** `dashboard/app/drivers/page.tsx` (Lines 74-88)

```typescript
const { data, error } = await supabase
  .from("users")
  .select("*")
  .eq("role", "driver") // ✅ Filter 1: Must be driver
  .order("full_name", { ascending: true });
```

**Filters Applied:**

- ✅ `role = 'driver'` only

**Status:** ⚠️ **NO tenant_id filter!** This could show drivers from all tenants, then hide them later.

---

### 2. Driver Fetching Query (Order Form Dropdown)

**Location:** `dashboard/app/components/EnhancedOrderForm.tsx` (Lines 88-95)

```typescript
const { data: drivers, error } = await supabase
  .from("users")
  .select("id, full_name, phone, email")
  .eq("role", "driver") // ✅ Filter 1: Must be driver
  .eq("is_active", true) // ⚠️ Filter 2: Must be ACTIVE
  .eq("tenant_id", userData.tenant_id) // ⚠️ Filter 3: Same tenant
  .order("full_name");
```

**Filters Applied:**

- ✅ `role = 'driver'`
- ⚠️ `is_active = true` (drivers might be getting deactivated!)
- ⚠️ `tenant_id = current_tenant` (tenant mismatch possible!)

**Status:** 🔴 **CRITICAL - Three filters that could hide drivers!**

---

### 3. Possible Root Causes

#### A) Drivers Getting Deactivated

**When drivers get deactivated:**

- Manual toggle: Admin clicks "Deactivate" on drivers page
- Database trigger: Some automated process sets `is_active = false`
- RLS policy: Policy might be updating `is_active`
- Session expiry: Driver hasn't logged in recently

**Evidence Needed:**

```sql
-- Check if drivers are actually inactive
SELECT id, full_name, email, role, is_active, tenant_id,
       last_sign_in_at, updated_at
FROM auth.users au
JOIN public.users pu ON au.id = pu.id
WHERE pu.role = 'driver'
ORDER BY pu.updated_at DESC;
```

#### B) Tenant ID Mismatches

**When tenant_id gets corrupted:**

- Driver created without tenant_id
- Driver moved to different tenant
- Order created with different tenant than driver
- RLS policy filters by wrong tenant

**Evidence Needed:**

```sql
-- Check tenant consistency
SELECT
  o.id as order_id,
  o.order_number,
  o.tenant_id as order_tenant,
  o.assigned_driver_id,
  u.full_name as driver_name,
  u.tenant_id as driver_tenant,
  CASE
    WHEN o.tenant_id = u.tenant_id THEN '✅ Match'
    ELSE '❌ MISMATCH'
  END as tenant_status
FROM orders o
LEFT JOIN users u ON o.assigned_driver_id = u.id
WHERE o.assigned_driver_id IS NOT NULL
ORDER BY o.created_at DESC
LIMIT 20;
```

#### C) RLS Policies Hiding Drivers

**Possible RLS issues:**

- Policy requires same tenant but tenant_id is null
- Policy checks user session but session expired
- Policy has time-based conditions
- Policy cascades and hides related records

**Evidence Needed:**

```sql
-- Check RLS policies on users table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
```

#### D) Real-Time Subscription Issues

**When subscriptions filter drivers:**

- Subscription has a filter that excludes drivers
- Subscription drops connection and doesn't reconnect
- Cache not updated after driver changes

**Evidence Needed:**

- Check browser console for subscription errors
- Check if subscription is receiving events

---

## 🧪 Diagnostic Steps

### Step 1: Check Current Driver Status

Run this query in Supabase SQL Editor:

```sql
-- Get all drivers and their status
SELECT
  id,
  email,
  full_name,
  role,
  is_active,
  tenant_id,
  last_sign_in_at,
  created_at,
  updated_at,
  CASE
    WHEN is_active = true THEN '✅ Active'
    ELSE '❌ Inactive'
  END as status,
  CASE
    WHEN tenant_id IS NULL THEN '⚠️ No Tenant'
    ELSE '✅ Has Tenant'
  END as tenant_status
FROM public.users
WHERE role = 'driver'
ORDER BY updated_at DESC;
```

**Expected Results:**

- All drivers should have `is_active = true`
- All drivers should have a `tenant_id`
- No drivers should be mysteriously deactivated

---

### Step 2: Check Tenant Consistency

```sql
-- Check if driver assignments match tenants
SELECT
  o.id,
  o.order_number,
  o.status,
  o.tenant_id as order_tenant,
  o.assigned_driver_id,
  u.full_name as driver_name,
  u.tenant_id as driver_tenant,
  u.is_active as driver_active,
  CASE
    WHEN o.tenant_id = u.tenant_id THEN '✅ Match'
    WHEN o.tenant_id IS NULL THEN '⚠️ Order has no tenant'
    WHEN u.tenant_id IS NULL THEN '⚠️ Driver has no tenant'
    ELSE '❌ MISMATCH - CRITICAL'
  END as tenant_match
FROM orders o
LEFT JOIN users u ON o.assigned_driver_id = u.id
WHERE o.assigned_driver_id IS NOT NULL
ORDER BY o.created_at DESC
LIMIT 50;
```

**Expected Results:**

- All rows should show '✅ Match'
- Any '❌ MISMATCH' indicates the problem

---

### Step 3: Check RLS Policies

```sql
-- Get RLS policies that might filter drivers
SELECT
  policyname,
  cmd,
  qual as "using_clause",
  with_check
FROM pg_policies
WHERE tablename = 'users'
  AND (qual LIKE '%is_active%' OR qual LIKE '%tenant_id%')
ORDER BY policyname;
```

**Look for:**

- Policies that check `is_active = true`
- Policies that filter by `tenant_id`
- Policies that might hide inactive drivers

---

### Step 4: Check Driver Activity Log

```sql
-- See when drivers were last active
SELECT
  u.id,
  u.full_name,
  u.email,
  u.is_active,
  u.updated_at as user_updated,
  au.last_sign_in_at,
  COUNT(o.id) as assigned_orders,
  MAX(o.created_at) as last_order_assigned
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
LEFT JOIN orders o ON o.assigned_driver_id = u.id
WHERE u.role = 'driver'
GROUP BY u.id, u.full_name, u.email, u.is_active, u.updated_at, au.last_sign_in_at
ORDER BY u.updated_at DESC;
```

**Look for:**

- Drivers with `is_active = false` and recent `updated_at`
- Drivers with orders but marked inactive

---

## 🔧 Potential Fixes

### Fix 1: Add Tenant Filter to Drivers Page

**Problem:** Drivers page doesn't filter by tenant, might show wrong drivers initially.

**Solution:** Add tenant filter to drivers page query.

**File:** `dashboard/app/drivers/page.tsx`

**Line:** 74-88

**Before:**

```typescript
const { data, error } = await supabase
  .from("users")
  .select("*")
  .eq("role", "driver")
  .order("full_name", { ascending: true });
```

**After:**

```typescript
const fetchDrivers = async () => {
  try {
    // Get current user's tenant
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { data: userData } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!userData?.tenant_id) {
      console.error("User has no tenant_id");
      setDrivers([]);
      setLoading(false);
      return;
    }

    // Fetch drivers with tenant filter
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "driver")
      .eq("tenant_id", userData.tenant_id) // ✅ Add tenant filter
      .order("full_name", { ascending: true });

    if (error) throw error;

    console.log(
      `Loaded ${data?.length || 0} drivers for tenant ${userData.tenant_id}`
    );
    setDrivers(data || []);
  } catch (error) {
    console.error("Error fetching drivers:", error);
  } finally {
    setLoading(false);
  }
};
```

---

### Fix 2: Show Inactive Drivers with Warning

**Problem:** `is_active = false` drivers are hidden completely.

**Solution:** Show inactive drivers but with a warning badge.

**File:** `dashboard/app/components/EnhancedOrderForm.tsx`

**Line:** 88-95

**Before:**

```typescript
const { data: drivers, error } = await supabase
  .from("users")
  .select("id, full_name, phone, email")
  .eq("role", "driver")
  .eq("is_active", true) // ❌ Hides inactive drivers
  .eq("tenant_id", userData.tenant_id)
  .order("full_name");
```

**After:**

```typescript
const { data: drivers, error } = await supabase
  .from("users")
  .select("id, full_name, phone, email, is_active") // ✅ Include is_active
  .eq("role", "driver")
  .eq("tenant_id", userData.tenant_id)
  .order("full_name");

// Separate active and inactive drivers
const activeDrivers = drivers?.filter((d) => d.is_active) || [];
const inactiveDrivers = drivers?.filter((d) => !d.is_active) || [];

setAvailableDrivers([...activeDrivers, ...inactiveDrivers]);
```

Then update the dropdown to show inactive status:

```typescript
<option key={driver.id} value={driver.id}>
  {driver.full_name}
  {!driver.is_active && " (⚠️ INACTIVE)"}
  {driver.phone && ` - ${driver.phone}`}
</option>
```

---

### Fix 3: Add Debug Logging

**Problem:** Can't see when/why drivers disappear.

**Solution:** Add comprehensive logging.

**Add to both files:**

```typescript
console.log("Fetching drivers with filters:", {
  role: "driver",
  is_active: true,
  tenant_id: userData.tenant_id,
  timestamp: new Date().toISOString(),
});

console.log("Drivers fetched:", {
  count: drivers?.length || 0,
  drivers: drivers?.map((d) => ({
    id: d.id,
    name: d.full_name,
    active: d.is_active,
    tenant: d.tenant_id,
  })),
});
```

---

### Fix 4: Prevent Accidental Deactivation

**Problem:** Drivers might be deactivated accidentally.

**Solution:** Add confirmation dialog and audit log.

**File:** `dashboard/app/drivers/page.tsx`

**Line:** ~348-360

**Before:**

```typescript
const handleToggleDriverStatus = async (
  driverId: string,
  currentStatus: boolean
) => {
  try {
    const { error } = await supabase
      .from("users")
      .update({ is_active: !currentStatus })
      .eq("id", driverId);

    if (error) throw error;
    fetchDrivers();
  } catch (error) {
    console.error("Error updating driver status:", error);
    alert("Failed to update driver status");
  }
};
```

**After:**

```typescript
const handleToggleDriverStatus = async (
  driverId: string,
  currentStatus: boolean,
  driverName: string
) => {
  // Confirm deactivation
  if (currentStatus) {
    const confirm = window.confirm(
      `⚠️ Deactivate ${driverName}?\n\n` +
        `This will:\n` +
        `• Remove them from driver selection lists\n` +
        `• Hide them from reports\n` +
        `• Keep their assigned orders intact\n\n` +
        `Are you sure?`
    );

    if (!confirm) return;
  }

  try {
    const { error } = await supabase
      .from("users")
      .update({
        is_active: !currentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", driverId);

    if (error) throw error;

    console.log(
      `Driver ${driverName} (${driverId}) ${
        currentStatus ? "deactivated" : "activated"
      }`
    );

    // Show success message
    alert(`Driver ${currentStatus ? "deactivated" : "activated"} successfully`);

    fetchDrivers();
  } catch (error) {
    console.error("Error updating driver status:", error);
    alert("Failed to update driver status");
  }
};
```

---

### Fix 5: Check for Automated Deactivation

**Problem:** Some process might be deactivating drivers automatically.

**Solution:** Check for database triggers or scheduled functions.

**Run this query:**

```sql
-- Check for triggers on users table
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users'
ORDER BY trigger_name;
```

**Also check:**

```sql
-- Check for scheduled functions
SELECT
  schemaname,
  funcname,
  pg_get_functiondef(oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(oid) LIKE '%is_active%'
ORDER BY funcname;
```

---

## 📋 Action Items

### Immediate Actions (Do Now)

1. **Run Diagnostic Queries**

   - [ ] Step 1: Check current driver status
   - [ ] Step 2: Check tenant consistency
   - [ ] Step 3: Check RLS policies
   - [ ] Step 4: Check driver activity log

2. **Check Browser Console**

   - [ ] Open dashboard in browser
   - [ ] Open DevTools → Console
   - [ ] Assign a driver to an order
   - [ ] Wait 5-10 minutes
   - [ ] Refresh page and check if driver still appears
   - [ ] Look for errors or warnings

3. **Check Database Logs**
   - [ ] Go to Supabase Dashboard → Database → Logs
   - [ ] Look for UPDATE queries on users table
   - [ ] Look for queries that change `is_active`

### Short-term Fixes (Today)

1. **Apply Fix 1: Add Tenant Filter**

   - [ ] Update drivers page query
   - [ ] Test driver list loads correctly
   - [ ] Verify only tenant's drivers shown

2. **Apply Fix 3: Add Debug Logging**

   - [ ] Add logging to driver fetch
   - [ ] Add logging to order form
   - [ ] Monitor logs for patterns

3. **Apply Fix 4: Prevent Accidental Deactivation**
   - [ ] Add confirmation dialog
   - [ ] Add success/error messages
   - [ ] Test activation/deactivation

### Medium-term Improvements (This Week)

1. **Apply Fix 2: Show Inactive Drivers**

   - [ ] Modify query to include inactive
   - [ ] Add visual indicator for inactive
   - [ ] Prevent assigning inactive drivers

2. **Add Driver Status Monitoring**

   - [ ] Create admin page showing driver activity
   - [ ] Show when drivers were last active
   - [ ] Alert when drivers become inactive

3. **Improve RLS Policies**
   - [ ] Review and document all policies
   - [ ] Test policies don't hide valid drivers
   - [ ] Add policy that prevents orphaning orders

---

## 🎯 Expected Outcomes

After applying fixes:

1. ✅ **Drivers filtered by tenant** - Only show current organization's drivers
2. ✅ **Inactive drivers visible** - Show with warning, don't hide
3. ✅ **Debug logging enabled** - Can track when/why drivers disappear
4. ✅ **Confirmation required** - Can't accidentally deactivate
5. ✅ **Consistent tenant IDs** - All drivers and orders match tenants

---

## 📊 Success Metrics

**Before Fix:**

- ❌ Drivers disappear after some time
- ❌ Orders lose assigned drivers
- ❌ No visibility into why it happens

**After Fix:**

- ✅ Drivers remain visible (unless intentionally deactivated)
- ✅ Orders keep driver assignments
- ✅ Clear logs show driver status changes
- ✅ Tenant filtering prevents cross-tenant issues

---

## 🔍 Next Steps

1. **Run diagnostic queries** to identify root cause
2. **Apply Fix 1** (tenant filter) immediately
3. **Apply Fix 3** (logging) to monitor behavior
4. **Monitor for 24-48 hours** to see if problem persists
5. **Apply remaining fixes** based on findings

---

**Status:** 🔍 **INVESTIGATION IN PROGRESS**

Please run the diagnostic queries and share the results!
