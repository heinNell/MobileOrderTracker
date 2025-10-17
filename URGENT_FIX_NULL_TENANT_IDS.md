# ⚡ URGENT FIX - Drivers Disappearing

**Problem:** Drivers "Enock Mukonyerwa" and "Nikkie" have `tenant_id = NULL`  
**Impact:** They don't appear in dashboard driver lists  
**Solution:** Run SQL update to assign correct tenant_id

---

## 🚨 RUN THIS NOW

### In Supabase SQL Editor:

```sql
-- Fix driver: Enock Mukonyerwa
UPDATE public.users
SET 
  tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43',
  updated_at = NOW()
WHERE id = '6231ff64-25dc-4fd1-9c7c-4606f700010d'
  AND role = 'driver';

-- Fix driver: Nikkie (duplicate account)
UPDATE public.users
SET 
  tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43',
  updated_at = NOW()
WHERE id = '720ea10c-5328-4821-a8f3-f710a0d176f8'
  AND role = 'driver';

-- Verify fix (should return 0 rows)
SELECT id, full_name, email, tenant_id
FROM public.users
WHERE role = 'driver' AND tenant_id IS NULL;
```

---

## ✅ Verify Fix Worked

### 1. Check SQL Results
- Last query should return **0 rows**
- Means all drivers now have tenant_id

### 2. Test Dashboard
1. Refresh your dashboard page
2. Go to **Drivers** page
3. You should now see **8 drivers** (including Enock and Nikkie)
4. Edit order `ORD-1760599769131`
5. Enock should appear in driver dropdown

---

## 🛡️ Prevent Future Issues

### Add Database Constraint

```sql
ALTER TABLE public.users 
ADD CONSTRAINT users_driver_must_have_tenant 
CHECK (role != 'driver' OR tenant_id IS NOT NULL);
```

This ensures all future drivers MUST have a tenant_id.

---

## 📊 What This Fixes

| Before | After |
|--------|-------|
| 6 drivers visible | 8 drivers visible |
| 2 orders show "Unassigned" | 2 orders show correct driver |
| Can't assign Enock/Nikkie | Can assign any driver |
| Drivers "disappear" randomly | All drivers always visible |

---

## 🎯 Why This Happened

Two drivers were created without `tenant_id`:
- Enock Mukonyerwa: `6231ff64-25dc-4fd1-9c7c-4606f700010d`
- Nikkie: `720ea10c-5328-4821-a8f3-f710a0d176f8`

Our dashboard code now filters by tenant (correct behavior):
```typescript
.eq("tenant_id", userData.tenant_id)
```

But these two drivers have `tenant_id = NULL`, so they don't match any query → "disappear"

---

## ✅ Complete!

After running the SQL:
- ✅ All drivers have tenant_id
- ✅ All drivers visible in dashboard
- ✅ No more "disappearing" drivers
- ✅ Order assignments display correctly

**Status: READY TO FIX - RUN SQL NOW!**
