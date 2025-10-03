# Type Alignment Analysis Report

## Mobile App vs Dashboard Data Structures

**Generated:** October 3, 2025  
**Status:** ⚠️ Issues Found - Requires Fixes

---

## Executive Summary

This analysis compares the data types and structures between:

- **Shared Types** (`/shared/types.ts`) - TypeScript interfaces
- **Dashboard App** (`/dashboard/app/page.tsx`) - Next.js order management
- **Mobile App** (`/mobile-app/src/screens/`) - React Native driver interface
- **Database Schema** (`/supabase/schema.sql`) - PostgreSQL with PostGIS

### Overall Assessment: ⚠️ CRITICAL ISSUES FOUND

**3 Critical Issues** requiring immediate fixes  
**2 Medium Priority** improvements needed  
**5 Verified Working** alignments

---

## ✅ Verified Correct Alignments

### 1. Shared Type Imports

- ✅ **Dashboard:** Correctly imports from `../../shared/types`
- ✅ **Mobile App:** Correctly imports from `../../../shared/types`
- Both applications use the same TypeScript definitions

### 2. Enum Types Alignment

- ✅ **OrderStatus:** Matches across all systems

  ```typescript
  // Shared types, Database enum, and both apps use:
  "pending" |
    "assigned" |
    "in_transit" |
    "arrived" |
    "loading" |
    "loaded" |
    "unloading" |
    "completed" |
    "cancelled";
  ```

- ✅ **UserRole:** Consistent everywhere

  ```typescript
  "admin" | "dispatcher" | "driver";
  ```

- ✅ **IncidentType:** Aligned
  ```typescript
  "delay" | "mechanical" | "traffic" | "weather" | "accident" | "other";
  ```

### 3. Order Basic Fields

- ✅ All standard fields match:
  - `id`, `tenant_id`, `order_number`, `sku`, `status`
  - `qr_code_data`, `qr_code_signature`, `qr_code_expires_at`
  - `assigned_driver_id`, `created_at`, `updated_at`

### 4. Foreign Key Relationships

- ✅ Dashboard correctly joins `assigned_driver` with:
  ```typescript
  assigned_driver:users!orders_assigned_driver_id_fkey(id, full_name)
  ```

### 5. Real-time Subscriptions

- ✅ Both apps use Supabase channels for real-time updates
- ✅ Dashboard: Subscribes to all orders table changes
- ✅ Mobile: Subscribes to specific order updates by ID

---

## 🚨 Critical Issues (Must Fix)

### Issue #1: Location Data Format Inconsistency

**Severity:** 🔴 CRITICAL - Will cause runtime errors

**Problem:**

- **TypeScript Interface** defines locations as objects:

  ```typescript
  interface Location {
    latitude: number;
    longitude: number;
  }

  interface Order {
    loading_point_location: Location; // ❌ Expects object
    unloading_point_location: Location;
  }
  ```

- **Database** stores as PostGIS Geography:

  ```sql
  loading_point_location GEOGRAPHY(POINT) NOT NULL
  -- Stored as: SRID=4326;POINT(longitude latitude)
  ```

- **Dashboard** sends WKT string format:

  ```typescript
  loading_point_location: `SRID=4326;POINT(${lng} ${lat})`; // ❌ String
  ```

- **Mobile App** expects to receive:
  ```typescript
  order.loading_point_location.latitude; // ❌ Will fail - no .latitude property
  order.loading_point_location.longitude; // ❌ Will fail - no .longitude property
  ```

**Impact:** Mobile app will crash when trying to access location coordinates

**Solution Required:**

1. Update shared `types.ts` to match database reality:

   ```typescript
   // Option A: Use GeoJSON format (recommended)
   interface Location {
     type: "Point";
     coordinates: [number, number]; // [longitude, latitude]
   }

   // Option B: Keep current but document PostGIS conversion
   // Add note that Supabase auto-converts GEOGRAPHY to GeoJSON
   ```

2. OR configure Supabase PostgREST to return GeoJSON format
3. OR add transformation layer in both apps

---

### Issue #2: Status Update Location Format Mismatch

**Severity:** 🔴 CRITICAL - Data corruption risk

**Problem:**
Mobile app creates status updates with inconsistent format:

```typescript
// mobile-app/src/screens/OrderDetailsScreen.tsx:130
.insert({
  order_id: order.id,
  driver_id: user.id,
  status: newStatus,
  location: location
    ? `POINT(${location.coords.longitude} ${location.coords.latitude})`  // ❌ Missing SRID
    : null,
  notes,
})
```

**Issues:**

1. Missing `SRID=4326;` prefix (dashboard includes it)
2. Inconsistent with dashboard's format
3. May cause PostGIS errors or incorrect coordinate system

**Solution Required:**
Update mobile app to use consistent format:

```typescript
location: location
  ? `SRID=4326;POINT(${location.coords.longitude} ${location.coords.latitude})`
  : null,
```

---

### Issue #3: Assigned Driver Type Mismatch

**Severity:** 🟡 MEDIUM - May cause undefined errors

**Problem:**

```typescript
// Shared types definition
interface Order {
  assigned_driver_id?: string;
  assigned_driver?: User; // ❌ Full User object expected
}
```

**Dashboard fetches:**

```typescript
assigned_driver:users!orders_assigned_driver_id_fkey(
  id,
  full_name  // ❌ Only fetches 2 fields, not full User object
)
```

**Impact:** If mobile app expects `assigned_driver.email` or other fields, it will be undefined

**Solution Required:**

1. Update shared types to reflect actual structure:
   ```typescript
   interface Order {
     assigned_driver_id?: string;
     assigned_driver?: {
       id: string;
       full_name: string;
     };
   }
   ```
2. OR fetch complete User object in dashboard:
   ```typescript
   assigned_driver:users!orders_assigned_driver_id_fkey(*)
   ```

---

## ⚠️ Medium Priority Issues

### Issue #4: Optional Fields Not Validated

**Severity:** 🟡 MEDIUM - Data integrity concern

**Problem:**
Dashboard conditionally adds optional fields:

```typescript
// Only adds if value exists
if (estimatedDistance) {
  orderData.estimated_distance_km = parseFloat(estimatedDistance) || null;
}
```

**Issue:** Schema allows these fields, but inconsistent population may cause:

- Mobile app expecting fields that don't exist
- Undefined checks needed everywhere

**Solution:**
Add default values for optional fields:

```typescript
orderData.estimated_distance_km = parseFloat(estimatedDistance) || null;
orderData.estimated_duration_minutes = parseInt(estimatedDuration) || null;
// Always set, even if null
```

---

### Issue #5: QR Code Signature Placeholder

**Severity:** 🟡 MEDIUM - Security concern

**Problem:**

```typescript
qr_code_signature: "pending"; // ❌ Should be cryptographic signature
```

**Impact:**

- Not a real signature
- QR codes not properly secured
- Edge Function should generate this

**Solution:**
Edge Function should generate proper HMAC signature:

```typescript
const signature = crypto
  .createHmac("sha256", secret)
  .update(qrCodeData)
  .digest("hex");
```

---

## 📊 Data Flow Analysis

### Order Creation Flow (Dashboard → Database)

```
User fills form
  ↓
Dashboard converts coordinates to WKT
  `SRID=4326;POINT(lng lat)`
  ↓
Supabase inserts into GEOGRAPHY column
  ↓
PostgreSQL stores binary geography data
```

### Order Retrieval Flow (Database → Mobile)

```
PostgreSQL GEOGRAPHY column
  ↓
PostgREST converts to... ???  ⚠️ UNKNOWN FORMAT
  ↓
Mobile app expects Location object { latitude, longitude }
  ↓
May crash if format doesn't match
```

**CRITICAL:** Need to verify actual format returned by Supabase!

---

## 🔧 Recommended Fixes (Priority Order)

### 1. Test Actual Location Format (IMMEDIATE)

```typescript
// Add this to mobile app temporarily to see actual format:
console.log(
  "Order location format:",
  JSON.stringify(order.loading_point_location)
);
```

### 2. Fix Status Update Location Format (IMMEDIATE)

```typescript
// mobile-app/src/screens/OrderDetailsScreen.tsx:130
location: location
  ? `SRID=4326;POINT(${location.coords.longitude} ${location.coords.latitude})`
  : null,
```

### 3. Update Types to Match Reality (HIGH PRIORITY)

Choose one approach:

- **Option A:** Update `types.ts` to use GeoJSON
- **Option B:** Add transformation helpers
- **Option C:** Configure PostgREST to return specific format

### 4. Standardize Optional Field Handling (MEDIUM)

Always set optional fields to explicit `null` if missing

### 5. Implement Proper QR Signatures (MEDIUM)

Update Edge Function to generate real cryptographic signatures

---

## 🧪 Testing Recommendations

### Test Case 1: Order Creation & Retrieval

```typescript
// 1. Create order in dashboard
// 2. Fetch in mobile app
// 3. Verify location fields are accessible:
console.log(order.loading_point_location.latitude); // Should not crash
```

### Test Case 2: Status Update with Location

```typescript
// 1. Mobile app updates status with location
// 2. Verify in database format is correct
// 3. Fetch in dashboard and verify readable
```

### Test Case 3: Assigned Driver Data

```typescript
// 1. Assign driver to order
// 2. Verify mobile app can access driver name
// 3. Check if other fields are available
```

---

## 📝 Action Items

- [ ] **CRITICAL:** Test actual Supabase location format
- [ ] **CRITICAL:** Fix mobile status update location format
- [ ] **HIGH:** Update `types.ts` Location interface
- [ ] **HIGH:** Test end-to-end order flow
- [ ] **MEDIUM:** Standardize optional field handling
- [ ] **MEDIUM:** Implement proper QR signatures
- [ ] **LOW:** Document PostGIS conversion behavior
- [ ] **LOW:** Add type guards for runtime validation

---

## Conclusion

While both applications correctly import from shared types, there are **critical mismatches** between the TypeScript interface definitions and the actual database format (PostGIS Geography). The most urgent issue is the Location data format, which will likely cause the mobile app to crash when accessing coordinates.

**Next Steps:**

1. Verify actual format returned by Supabase for Geography columns
2. Update either the types or add transformation layer
3. Fix mobile app status update location format
4. Test complete order lifecycle from creation to mobile display

**Estimated Fix Time:** 2-4 hours for all critical issues
