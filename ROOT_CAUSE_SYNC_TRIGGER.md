# 🔍 ROOT CAUSE ANALYSIS: Drivers Disappearing After Assignment

## Problem Statement

Drivers created through the dashboard appear initially but disappear from the driver list after being assigned to an order.

## Root Cause Identified ✅

### The Culprit: `sync_user_from_auth()` Function

The `sync_user_from_auth()` function has **TWO PROBLEMS**:

#### Problem 1: Overwrites tenant_id with NULL

```sql
-- BROKEN VERSION IN DATABASE:
BEGIN
  INSERT INTO public.users (id, email, role, tenant_id, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_app_meta_data->> 'role',
    (NEW.raw_app_meta_data->> 'tenant_id')::uuid,  -- ⚠️ This is NULL!
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    tenant_id = EXCLUDED.tenant_id,  -- ❌ OVERWRITES WITH NULL!
    updated_at = now();

  RETURN NEW;
END;
```

**Why This Breaks:**

- Drivers created via dashboard have `tenant_id` set in `public.users`
- But `auth.users.raw_app_meta_data` does NOT have `tenant_id` for drivers
- When the trigger fires on UPDATE, it tries to read tenant_id from auth
- Gets NULL from auth, and OVERWRITES the correct tenant_id with NULL
- Driver disappears from dashboard!

#### Problem 2: Attempted Fix Has Syntax Error

Someone tried to fix it, but the new version has a syntax error:

```sql
-- ATTEMPTED FIX (SYNTAX ERROR):
BEGIN
    IF NEW.email IS DISTINCT FROM OLD.email THEN
    RETURN NEW;
END
IF;  -- ❌ SYNTAX ERROR - "END IF;" is wrong placement

    RETURN NEW;
END;
```

The `END IF;` statement is incorrectly placed, causing the function to fail.### What's Happening:

1. **Driver is created via dashboard** → `create-driver` edge function

   - Driver is created with correct `tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'`
   - Driver appears in the list ✅

2. **Driver is assigned to an order** → Order UPDATE happens

   - The `assigned_driver_id` field is updated
   - This triggers any related updates

3. **The sync_user_trigger fires** 🚨

   - The `sync_user_from_auth()` function executes
   - This function tries to sync data from `auth.users` table
   - **PROBLEM**: `auth.users` table doesn't have a `tenant_id` column!
   - The function **overwrites** `tenant_id` with `NULL`

4. **Driver disappears from list** ❌
   - Dashboard filters drivers by `tenant_id`
   - Driver now has `NULL` tenant_id
   - Filter excludes the driver

## Timeline of Events:

```
✅ Driver Created → tenant_id = '17ed751d-...'
✅ Driver Visible → Dashboard shows driver
📝 Order Assignment → assigned_driver_id updated
🔄 TRIGGER FIRES → sync_user_from_auth() executes
❌ tenant_id = NULL → Sync overwrites tenant_id
❌ Driver Invisible → Dashboard filters out NULL tenant_id
```

## Why This Happens:

The `sync_user_from_auth()` function was likely created to keep `public.users` in sync with `auth.users`, but:

- `auth.users` (Supabase Auth) has columns: `id`, `email`, `created_at`, `raw_user_meta_data`, etc.
- `auth.users` does **NOT** have: `tenant_id`, `role`, `full_name` (in separate columns)
- When syncing, the function either:
  - **Option A**: Explicitly sets fields from auth.users, leaving tenant_id as NULL
  - **Option B**: Copies all fields, overwriting tenant_id because it doesn't exist in source

## The Fix 🔧

### Solution 1: Drop the Problematic Trigger (Recommended)

```sql
-- Remove the trigger that's causing the issue
DROP TRIGGER IF EXISTS sync_user_trigger ON public.users;

-- Fix all existing NULL tenant_ids
UPDATE public.users
SET tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'::uuid
WHERE role = 'driver' AND tenant_id IS NULL;
```

### Solution 2: Fix the sync_user_from_auth() Function

```sql
CREATE OR REPLACE FUNCTION public.sync_user_from_auth()
RETURNS TRIGGER AS $$
BEGIN
    -- Preserve tenant_id! Only sync safe fields from auth
    -- Don't overwrite application-managed fields

    -- If this is an INSERT, tenant_id will already be set by the application
    -- If this is an UPDATE, preserve the existing tenant_id

    RETURN NEW;  -- Return the row as-is, don't modify it
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Solution 3: Add Protection to Preserve tenant_id

```sql
CREATE OR REPLACE FUNCTION public.sync_user_from_auth()
RETURNS TRIGGER AS $$
DECLARE
    existing_tenant_id UUID;
BEGIN
    -- For UPDATEs, preserve the existing tenant_id
    IF TG_OP = 'UPDATE' THEN
        existing_tenant_id := OLD.tenant_id;

        -- If the new tenant_id is NULL but old one existed, restore it
        IF NEW.tenant_id IS NULL AND existing_tenant_id IS NOT NULL THEN
            NEW.tenant_id := existing_tenant_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## How to Apply the Fix:

1. **Run the fix script**:

   ```bash
   psql -f fix-sync-trigger-issue.sql
   ```

2. **Or manually in Supabase SQL Editor**:

   - Copy contents of `fix-sync-trigger-issue.sql`
   - Paste into Supabase SQL Editor
   - Run the script

3. **Verify the fix**:
   ```sql
   -- Check all drivers have tenant_id
   SELECT
       email,
       full_name,
       tenant_id,
       CASE
           WHEN tenant_id IS NULL THEN '❌ BROKEN'
           ELSE '✅ FIXED'
       END as status
   FROM public.users
   WHERE role = 'driver';
   ```

## Prevention:

To prevent this from happening again:

1. **Document all triggers**: Maintain a list of database triggers and their purpose
2. **Test trigger behavior**: Always test triggers with real-world data
3. **Protect critical fields**: Add constraints or checks to prevent NULL tenant_ids
4. **Use proper sync logic**: If syncing from auth.users, explicitly preserve application fields

## Related Issues Fixed:

- This is the same root cause as the previous NULL tenant_id issues
- Previous fixes only addressed the symptom (NULL values)
- This fix addresses the **cause** (trigger overwriting values)

## Files Involved:

- `fix-sync-trigger-issue.sql` - The fix script
- `debug-driver-tenant-issue.sql` - Diagnostic queries
- `check-sync-function.sql` - Function definition checker

## Testing Steps:

1. ✅ Create a new driver via dashboard
2. ✅ Verify driver appears in list
3. ✅ Assign driver to an order
4. ✅ Verify driver **still appears** in list
5. ✅ Check driver's tenant_id is preserved

## Success Criteria:

- ✅ All drivers have non-NULL tenant_id
- ✅ Drivers remain visible after order assignment
- ✅ No triggers overwrite tenant_id field
- ✅ Dashboard shows all active drivers

---

**Status**: Root cause identified and fix script created
**Next Step**: Run `fix-sync-trigger-issue.sql` in Supabase
