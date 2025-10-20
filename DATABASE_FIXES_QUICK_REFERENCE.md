# Supabase Database Fixes - Quick Reference

## Priority: CRITICAL - Execute Before Testing

### Issue 1: Contact Creation Fails (full_name column)

**File:** `FIX_CONTACTS_TABLE.sql`

**Execute in:** Supabase SQL Editor → https://supabase.com/dashboard/project/[YOUR_PROJECT]/sql

**What it fixes:**
- ✅ Auto-generates `full_name` from `first_name` + `last_name`
- ✅ Falls back to `company_name` if no names provided
- ✅ Makes `first_name`, `last_name`, `full_name` nullable
- ✅ Adds check constraint for data integrity

**Impact:** Contact creation modal will work correctly

**Verification:**
```sql
-- After running the fix, test with:
SELECT 
  column_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'contacts'
  AND column_name IN ('full_name', 'first_name', 'last_name');

-- Should show all three columns as nullable
```
###### RESULTS #####


[
  {
    "column_name": "first_name",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "last_name",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "full_name",
    "is_nullable": "YES",
    "column_default": "''::character varying"
  }
]
---

## How to Apply Fixes

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project: **liagltqpeilbswuqcahp**
3. Click **SQL Editor** in left sidebar

### Step 2: Execute FIX_CONTACTS_TABLE.sql
1. Copy entire contents of `FIX_CONTACTS_TABLE.sql`
2. Paste into SQL Editor
3. Click **Run** button
4. Verify success messages in output

### Step 3: Verify the Fix
```sql
-- Test contact creation
INSERT INTO public.contacts (
  tenant_id,
  first_name,
  last_name,
  contact_type
) VALUES (
  (SELECT id FROM public.tenants LIMIT 1),
  'Test',
  'User',
  'customer'
) RETURNING id, full_name;

-- Should return: full_name = 'Test User'

-- Clean up
DELETE FROM public.contacts WHERE first_name = 'Test' AND last_name = 'User';
```

### Step 4: Test in Production Dashboard
1. Visit https://dash-matanuskatransport.vercel.app/contacts
2. Click "Create New Contact"
3. Fill in First Name and Last Name
4. Submit form
5. Should succeed without errors

---

## Additional Database Verification

### Check All Required Tables Exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'contacts',
    'transporters',
    'enhanced_geofences',
    'order_templates',
    'order_contacts',
    'orders',
    'users',
    'tenants'
  )
ORDER BY table_name;
```
###### RESULTS #####

[
  {
    "table_name": "contacts"
  },
  {
    "table_name": "enhanced_geofences"
  },
  {
    "table_name": "order_contacts"
  },
  {
    "table_name": "order_templates"
  },
  {
    "table_name": "orders"
  },
  {
    "table_name": "tenants"
  },
  {
    "table_name": "transporters"
  },
  {
    "table_name": "users"
  }
]

### Check RLS is Enabled
```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('contacts', 'transporters', 'enhanced_geofences', 'order_templates', 'orders')
ORDER BY tablename;
```
###### RESULTS #####

[
  {
    "schemaname": "public",
    "tablename": "contacts",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "enhanced_geofences",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "order_templates",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "orders",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "transporters",
    "rls_enabled": true
  }
]
### Check Trigger is Working
```sql
-- Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_generate_contact_full_name';

-- Should return:
-- trigger_name: trigger_generate_contact_full_name
-- event_manipulation: INSERT, UPDATE
-- event_object_table: contacts


###### RESULTS #####

[
  {
    "trigger_name": "trigger_generate_contact_full_name",
    "event_manipulation": "INSERT",
    "event_object_table": "contacts"
  },
  {
    "trigger_name": "trigger_generate_contact_full_name",
    "event_manipulation": "UPDATE",
    "event_object_table": "contacts"
  }
]
---

## Troubleshooting

### If Contact Creation Still Fails:

**Check 1: Trigger Function Exists**
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'generate_contact_full_name';
```
###### RESULTS #####


[
  {
    "routine_name": "generate_contact_full_name"
  }
]

**Check 2: Column Constraints**
```sql
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.contacts'::regclass
  AND conname LIKE '%name%';
```


###### RESULTS #####

[
  {
    "constraint_name": "contacts_name_check",
    "constraint_type": "c",
    "definition": "CHECK ((((first_name IS NOT NULL) AND ((first_name)::text <> ''::text)) OR ((last_name IS NOT NULL) AND ((last_name)::text <> ''::text)) OR ((company_name IS NOT NULL) AND ((company_name)::text <> ''::text)) OR ((full_name IS NOT NULL) AND ((full_name)::text <> ''::text))))"
  }
]


**Check 3: Test Trigger Manually**
```sql
-- Insert test record
INSERT INTO contacts (tenant_id, first_name, last_name, contact_type)
VALUES (
  (SELECT id FROM tenants LIMIT 1),
  'Manual', 'Test', 'customer'
)
RETURNING id, full_name;

-- Check if full_name was generated
-- Expected: full_name = 'Manual Test'

-- Delete test
DELETE FROM contacts WHERE first_name = 'Manual' AND last_name = 'Test';
```

---

## Success Criteria

After applying fixes, all of these should be ✅:

- [x] `FIX_CONTACTS_TABLE.sql` executed successfully
- [ ] Trigger `trigger_generate_contact_full_name` exists
- [ ] Function `generate_contact_full_name()` exists
- [ ] `full_name` column is nullable
- [ ] `first_name` column is nullable
- [ ] `last_name` column is nullable
- [ ] Check constraint `contacts_name_check` exists
- [ ] Test contact creation succeeds in SQL
- [ ] Test contact creation succeeds in dashboard

---

## Related Documentation

- **Backend Verification:** `BACKEND_VERIFICATION_COMPLETE.md`
- **Deployment Guide:** `FINAL_DEPLOYMENT_VERIFICATION.md`
- **Schema Definition:** `enhanced-preconfiguration-system.sql`

---

## Quick Command Reference

```bash
# View file in terminal
cat FIX_CONTACTS_TABLE.sql

# Copy to clipboard (if on Linux/Mac)
cat FIX_CONTACTS_TABLE.sql | pbcopy  # Mac
cat FIX_CONTACTS_TABLE.sql | xclip -selection clipboard  # Linux

# Edit file
nano FIX_CONTACTS_TABLE.sql
```

---

**Last Updated:** October 20, 2025  
**Status:** Ready to execute  
**Priority:** CRITICAL - Required for contact creation functionality
