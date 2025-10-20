# SQL Fixes Quick Reference Guide

**Date:** October 20, 2025  
**Purpose:** Essential SQL fixes for Supabase backend compatibility  
**Priority:** Execute in Supabase SQL Editor before production use

---

## 🔴 Critical Fix: Contacts Table `full_name` Column

### Issue:
Contact creation fails with error: "null value in column 'full_name' violates not-null constraint"

### Root Cause:
- `full_name` column has NOT NULL constraint
- No default value or generated column logic
- Frontend doesn't always provide `full_name`

### Solution Options:

#### Option 1: Make full_name Nullable (Recommended)
```sql
-- Allow null values in full_name column
ALTER TABLE contacts 
ALTER COLUMN full_name DROP NOT NULL;

-- Add a default empty string if preferred
ALTER TABLE contacts 
ALTER COLUMN full_name SET DEFAULT '';
```

#### Option 2: Create Computed Column (Best Practice)
```sql
-- Drop existing column and recreate as generated
ALTER TABLE contacts DROP COLUMN full_name;

ALTER TABLE contacts 
ADD COLUMN full_name TEXT GENERATED ALWAYS AS (
  COALESCE(first_name || ' ' || last_name, first_name, last_name, company_name, '')
) STORED;

-- Add index for performance
CREATE INDEX idx_contacts_full_name ON contacts(full_name);
```

#### Option 3: Database Trigger (Alternative)
```sql
-- Create function to auto-populate full_name
CREATE OR REPLACE FUNCTION generate_full_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.full_name := COALESCE(
    NULLIF(TRIM(NEW.first_name || ' ' || NEW.last_name), ''),
    NEW.first_name,
    NEW.last_name,
    NEW.company_name,
    ''
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to contacts table
DROP TRIGGER IF EXISTS trg_contacts_full_name ON contacts;
CREATE TRIGGER trg_contacts_full_name
  BEFORE INSERT OR UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION generate_full_name();

-- Backfill existing records
UPDATE contacts 
SET full_name = COALESCE(
  NULLIF(TRIM(first_name || ' ' || last_name), ''),
  first_name,
  last_name,
  company_name,
  ''
)
WHERE full_name IS NULL OR full_name = '';
```

### Verification:
```sql
-- Test contact creation without full_name
INSERT INTO contacts (
  tenant_id,
  first_name,
  last_name,
  primary_email,
  created_by
) VALUES (
  'your-tenant-id',
  'John',
  'Doe',
  'john.doe@example.com',
  'your-user-id'
);

-- Verify full_name was auto-generated
SELECT id, first_name, last_name, full_name 
FROM contacts 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 📋 Other Recommended Fixes

### 1. Transporters Table: Similar full_name Issue
```sql
-- Option 1: Make nullable
ALTER TABLE transporters 
ALTER COLUMN full_name DROP NOT NULL;

-- Option 2: Create computed column
ALTER TABLE transporters DROP COLUMN IF EXISTS full_name;
ALTER TABLE transporters 
ADD COLUMN full_name TEXT GENERATED ALWAYS AS (
  COALESCE(first_name || ' ' || last_name, company_name, '')
) STORED;
```

### 2. Ensure Proper Indexes for Performance
```sql
-- Contacts table indexes
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(primary_email);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_name);
CREATE INDEX IF NOT EXISTS idx_contacts_active ON contacts(is_active) WHERE is_active = true;

-- Transporters table indexes
CREATE INDEX IF NOT EXISTS idx_transporters_tenant_id ON transporters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transporters_email ON transporters(primary_email);
CREATE INDEX IF NOT EXISTS idx_transporters_company ON transporters(company_name);
CREATE INDEX IF NOT EXISTS idx_transporters_active ON transporters(is_active) WHERE is_active = true;

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_driver ON orders(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
```

### 3. Fix RLS Policies for Contacts Selection
```sql
-- Ensure contacts can be selected across tenants if needed
-- Or enforce strict tenant isolation

-- Strict tenant isolation (recommended)
DROP POLICY IF EXISTS "Contacts are viewable by users in same tenant" ON contacts;
CREATE POLICY "Contacts are viewable by users in same tenant"
ON contacts FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  )
);

-- Allow insert for authenticated users in same tenant
DROP POLICY IF EXISTS "Contacts are insertable by authenticated users" ON contacts;
CREATE POLICY "Contacts are insertable by authenticated users"
ON contacts FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  )
);

-- Allow update for authenticated users in same tenant
DROP POLICY IF EXISTS "Contacts are updatable by authenticated users" ON contacts;
CREATE POLICY "Contacts are updatable by authenticated users"
ON contacts FOR UPDATE
USING (
  tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  )
);
```

### 4. Add Missing Columns for Frontend Compatibility
```sql
-- Ensure contacts table has all required columns
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS transporter_id UUID REFERENCES transporters(id),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Ensure transporters table has all required columns
ALTER TABLE transporters 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Add indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_contacts_transporter ON contacts(transporter_id);
CREATE INDEX IF NOT EXISTS idx_contacts_created_by ON contacts(created_by);
CREATE INDEX IF NOT EXISTS idx_transporters_created_by ON transporters(created_by);
```

---

## 🔍 Diagnostic Queries

### Check Table Structure
```sql
-- View contacts table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'contacts'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- View transporters table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'transporters'
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

### Check RLS Policies
```sql
-- View all policies on contacts table
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
WHERE tablename IN ('contacts', 'transporters', 'orders')
ORDER BY tablename, policyname;
```

### Check Indexes
```sql
-- View all indexes on main tables
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('contacts', 'transporters', 'orders')
  AND schemaname = 'public'
ORDER BY tablename, indexname;
```

### Test Data Query
```sql
-- Check existing contacts
SELECT 
  id,
  first_name,
  last_name,
  full_name,
  company_name,
  primary_email,
  tenant_id,
  created_at
FROM contacts
ORDER BY created_at DESC
LIMIT 10;

-- Check for null full_names
SELECT COUNT(*) as null_full_names
FROM contacts
WHERE full_name IS NULL OR full_name = '';

-- Check tenant distribution
SELECT 
  tenant_id,
  COUNT(*) as contact_count
FROM contacts
GROUP BY tenant_id
ORDER BY contact_count DESC;
```

---

## ⚠️ Important Notes

### Before Executing:
1. **Backup your database** (Supabase auto-backups, but verify)
2. **Test in development** environment first if possible
3. **Notify users** if making breaking changes
4. **Schedule maintenance window** for production changes

### Execution Order:
1. ✅ Fix `full_name` column (Option 2 or 3 recommended)
2. ✅ Add missing indexes
3. ✅ Verify RLS policies
4. ✅ Add missing columns
5. ✅ Run diagnostic queries
6. ✅ Test contact/transporter creation from frontend

### Rollback Plan:
```sql
-- If Option 2 (computed column) causes issues, revert:
ALTER TABLE contacts DROP COLUMN full_name;
ALTER TABLE contacts ADD COLUMN full_name TEXT;

-- If Option 3 (trigger) causes issues:
DROP TRIGGER IF EXISTS trg_contacts_full_name ON contacts;
DROP FUNCTION IF EXISTS generate_full_name();
```

---

## 🎯 Quick Start (Recommended)

**Execute this in Supabase SQL Editor:**

```sql
-- 1. Fix contacts table
ALTER TABLE contacts DROP COLUMN IF EXISTS full_name CASCADE;
ALTER TABLE contacts 
ADD COLUMN full_name TEXT GENERATED ALWAYS AS (
  COALESCE(
    NULLIF(TRIM(first_name || ' ' || last_name), ''),
    first_name,
    last_name,
    company_name,
    'Unknown'
  )
) STORED;

-- 2. Fix transporters table
ALTER TABLE transporters DROP COLUMN IF EXISTS full_name CASCADE;
ALTER TABLE transporters 
ADD COLUMN full_name TEXT GENERATED ALWAYS AS (
  COALESCE(
    NULLIF(TRIM(first_name || ' ' || last_name), ''),
    company_name,
    'Unknown'
  )
) STORED;

-- 3. Add essential indexes
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_full_name ON contacts(full_name);
CREATE INDEX IF NOT EXISTS idx_transporters_tenant_id ON transporters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transporters_full_name ON transporters(full_name);

-- 4. Verify
SELECT 'Contacts with full_name' as check_type, COUNT(*) as count 
FROM contacts WHERE full_name IS NOT NULL
UNION ALL
SELECT 'Transporters with full_name', COUNT(*) 
FROM transporters WHERE full_name IS NOT NULL;
```

**Expected Output:**
```
check_type                    | count
------------------------------|-------
Contacts with full_name       | [all rows]
Transporters with full_name   | [all rows]
```

---

## 📞 Support

**Supabase Dashboard:** https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]  
**SQL Editor:** Dashboard → SQL Editor → New Query  
**Documentation:** https://supabase.com/docs/guides/database

---

**Last Updated:** October 20, 2025  
**Status:** Ready for production deployment  
**Estimated Execution Time:** 2-3 minutes
