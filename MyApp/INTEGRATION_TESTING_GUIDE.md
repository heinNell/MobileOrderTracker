# 🧪 Mobile App Integration Testing Guide

## Quick Test Script - 15 Minutes

### Test 1: Mobile Login ✅ (5 minutes)

**Prerequisites:**

- Dashboard is accessible
- You have a user account that works in dashboard

**Steps:**

1. Open mobile app (or web preview)
2. Try to login with dashboard credentials
3. **Expected:** Should login successfully
4. **If fails:** Check error message - likely same tenant_id issue

**Command to start app:**

```bash
cd /workspaces/MobileOrderTracker/MyApp
npm start
# Then press 'w' for web, or scan QR for mobile
```

**Verification Queries:**

```sql
-- Check if mobile user has tenant_id
SELECT
    u.email,
    u.tenant_id,
    u.role,
    t.name as tenant_name
FROM public.users u
LEFT JOIN public.tenants t ON t.id = u.tenant_id
WHERE u.email = 'YOUR_EMAIL_HERE';

-- If tenant_id is NULL, mobile login will fail
-- Fix: Run FIX_LOGIN_ISSUE.sql from dashboard fixes
```

---

### Test 2: Order Dashboard → Mobile Sync ✅ (5 minutes)

**Prerequisites:**

- Mobile app logged in
- Dashboard accessible
- Driver account (not admin)

**Steps:**

**In Dashboard:**

1. Open Orders page
2. Create new order or select existing
3. Assign to your driver account
4. Note the order number

**In Mobile App:**

1. Go to "My Orders" tab
2. Pull to refresh
3. **Expected:** Assigned order appears in list
4. Tap on order
5. **Expected:** Order details load correctly

**If Order Doesn't Appear:**
Check these queries:

```sql
-- Verify order is assigned to correct driver
SELECT
    id,
    order_number,
    status,
    assigned_driver_id,
    tenant_id
FROM orders
WHERE assigned_driver_id = 'YOUR_USER_ID';

-- Check driver's tenant matches order tenant
SELECT
    u.id as user_id,
    u.email,
    u.tenant_id as user_tenant,
    COUNT(o.id) as assigned_orders
FROM users u
LEFT JOIN orders o ON o.assigned_driver_id = u.id AND o.tenant_id = u.tenant_id
WHERE u.id = 'YOUR_USER_ID'
GROUP BY u.id, u.email, u.tenant_id;
```

**Realtime Subscription Test:**

```javascript
// Check if subscription is working
// In mobile app console (F12 if on web):
// You should see: "✅ Subscribed to order updates"

// Trigger: Update order status in dashboard
// Expected: Mobile app shows updated status within 10 seconds
```

---

### Test 3: Location Tracking ✅ (5 minutes)

**Prerequisites:**

- Mobile app logged in
- Order assigned to driver
- Location permissions granted

**Steps:**

**In Mobile App:**

1. Open assigned order
2. Tap "Start Tracking" button
3. **Expected:** Success message "Location tracking started"
4. See tracking icon/indicator showing active
5. (If on real device) Move around
6. (If on simulator) Use Location > Custom Location

**In Dashboard:**

1. Open "Tracking" or "Live Map" view
2. **Expected:** Driver marker appears on map
3. **Expected:** Location updates as driver moves
4. Check timestamp is recent (< 1 minute old)

**Verification Queries:**

```sql
-- Check if locations are being recorded
SELECT
    driver_id,
    recorded_at,
    ST_AsText(location) as location_text,
    accuracy,
    speed
FROM driver_locations
WHERE driver_id = 'YOUR_USER_ID'
ORDER BY recorded_at DESC
LIMIT 5;

-- Expected output:
-- location_text: "POINT(-122.4194 37.7749)"
-- recorded_at: Recent timestamp
-- accuracy: Number (meters)

-- If no records, check:
SELECT
    d.id,
    d.full_name,
    u.email,
    COUNT(dl.id) as location_count
FROM drivers d
JOIN users u ON u.id = d.id
LEFT JOIN driver_locations dl ON dl.driver_id = d.id
WHERE d.id = 'YOUR_USER_ID'
GROUP BY d.id, d.full_name, u.email;
```

**Common Issues:**

1. **No locations recorded:**
   - Check location permissions granted
   - Check LocationService initialization
   - Check network connectivity

2. **Locations not showing in dashboard:**
   - Check PostGIS format is correct
   - Verify map component is rendering
   - Check tenant_id filtering isn't blocking

3. **Old timestamps:**
   - Check background location is enabled
   - Verify tracking service is running
   - Check battery optimization isn't killing app

---

## Detailed Integration Tests

### A. Authentication Flow

**Test A1: First Time Login**

```
1. Clear app data/cache
2. Open app
3. Should see login screen
4. Enter credentials
5. Should redirect to dashboard
6. Check user profile loads
```

**Test A2: Session Persistence**

```
1. Login successfully
2. Close app completely
3. Reopen app
4. Should go directly to dashboard (no login screen)
5. User should still be logged in
```

**Test A3: Logout**

```
1. From dashboard, go to Profile
2. Tap "Logout"
3. Should clear session
4. Should redirect to login screen
5. Reopen app, should show login screen
```

**Test A4: Invalid Credentials**

```
1. Enter wrong email
2. Should show error: "Invalid credentials"
3. Enter wrong password
4. Should show error: "Invalid credentials"
5. Should not crash app
```

---

### B. Order Management Flow

**Test B1: View Orders**

```
1. Login as driver
2. Go to "My Orders" tab
3. Should see list of assigned orders
4. Orders should show:
   - Order number
   - Status
   - Loading/unloading points
   - Distance
5. Pull to refresh should update list
```

**Test B2: Order Details**

```
1. Tap on an order from list
2. Should navigate to details screen
3. Should show complete order info:
   - Order number
   - Status badge
   - Driver name
   - Loading point (name, address)
   - Unloading point (name, address)
   - Timeline (created, activated, etc.)
   - Distance/duration
4. "Navigate" buttons should open maps
```

**Test B3: Status Updates**

```
1. Open order in "assigned" status
2. Tap "Activate Load"
3. Should navigate to LoadActivationScreen
4. Complete activation
5. Order status should update to "activated"
6. Tap "Start Order"
7. Status should update to "in_progress"
8. Continue through workflow:
   - in_progress → in_transit
   - in_transit → arrived
   - arrived → loading
   - loading → loaded
   - loaded → unloading
   - unloading → completed
9. Each transition should:
   - Show confirmation dialog
   - Update status in database
   - Refresh UI
   - Show success message
```

**Test B4: Real-time Updates**

```
Setup: Two devices/windows
- Device A: Mobile app (driver)
- Device B: Dashboard (admin)

1. Device B: Assign order to driver
2. Device A: Should see order appear (within 30 sec)
3. Device A: Update order status
4. Device B: Should see status change (within 30 sec)
5. Device B: Reassign order to different driver
6. Device A: Order should disappear from list
```

---

### C. QR Code Workflow

**Test C1: QR Scanner Access**

```
1. Login as driver
2. Tap "QR Scanner" tab
3. Should request camera permission
4. Grant permission
5. Camera view should appear
6. Scanner frame should be visible
```

**Test C2: Valid QR Scan**

```
1. Open QR scanner
2. Have valid order QR code ready (from dashboard)
3. Point camera at QR code
4. Should scan and show success message
5. Should navigate to order details
6. Order should be activated
```

**Test C3: Invalid QR Scan**

```
1. Open QR scanner
2. Scan random QR code (not order)
3. Should show error: "Invalid order QR code"
4. Should stay on scanner screen
5. Should allow retry
```

**Test C4: QR from Order Details**

```
1. Open order details
2. Tap "Scan QR" button
3. Scanner should open
4. Scan order QR
5. Should return to order details
6. Status should update
```

---

### D. Location Tracking

**Test D1: Start Tracking**

```
1. Open order details
2. Order should be in trackable status (assigned/activated/in_progress)
3. Tap "Start Tracking"
4. Should request location permission (if not granted)
5. Grant permission
6. Should show success message
7. Button should change to "Stop Tracking"
8. Tracking indicator should show "active"
```

**Test D2: Background Tracking**

```
1. Start tracking
2. Navigate away from order details
3. Go to different tab
4. Tracking should continue
5. Close app (background)
6. Wait 1 minute
7. Reopen app
8. Tracking should still be active
9. New locations should have been recorded
```

**Test D3: Stop Tracking**

```
1. While tracking is active
2. Tap "Stop Tracking"
3. Should show confirmation
4. Confirm stop
5. Tracking should stop
6. No new locations recorded after this
7. Button should change to "Start Tracking"
```

**Test D4: Auto-Stop on Complete**

```
1. Start tracking for an order
2. Complete the order (status → completed)
3. Tracking should automatically stop
4. No new locations recorded after completion
```

**Test D5: Location Accuracy**

```
1. Start tracking
2. Check location accuracy in database
3. Should be < 50 meters for good GPS
4. Should be < 100 meters for WiFi
5. If accuracy > 100, show warning in app
```

---

### E. Profile & Settings

**Test E1: View Profile**

```
1. Tap "Profile" tab
2. Should show:
   - User name
   - Email
   - Role (driver/admin)
   - Tenant name
   - Account created date
3. All info should match dashboard user
```

**Test E2: Update Profile** (if implemented)

```
1. Tap "Edit Profile"
2. Change name
3. Change phone
4. Save
5. Changes should persist
6. Dashboard should show updated info
```

**Test E3: Settings** (if implemented)

```
1. Open settings
2. Toggle auto-refresh
3. Change tracking interval
4. Update notification preferences
5. Settings should persist after app restart
```

---

## Test Results Template

### Test Session Info

```
Date: October 17, 2025
Tester: [Your Name]
Device: [iPhone 15 / Android Pixel 7 / Web Browser]
OS Version: [iOS 17.0 / Android 14 / Chrome 119]
App Version: 1.0.0
```

### Results Summary

```
✅ PASS | ❌ FAIL | ⚠️ PARTIAL | ⏭️ SKIPPED

Authentication:
- [ ] A1: First Time Login
- [ ] A2: Session Persistence
- [ ] A3: Logout
- [ ] A4: Invalid Credentials

Order Management:
- [ ] B1: View Orders
- [ ] B2: Order Details
- [ ] B3: Status Updates
- [ ] B4: Real-time Updates

QR Code:
- [ ] C1: Scanner Access
- [ ] C2: Valid QR Scan
- [ ] C3: Invalid QR Scan
- [ ] C4: QR from Order Details

Location Tracking:
- [ ] D1: Start Tracking
- [ ] D2: Background Tracking
- [ ] D3: Stop Tracking
- [ ] D4: Auto-Stop on Complete
- [ ] D5: Location Accuracy

Profile:
- [ ] E1: View Profile
- [ ] E2: Update Profile
- [ ] E3: Settings
```

### Issues Found

```
Issue #1:
- Test: [Test ID]
- Severity: Critical / High / Medium / Low
- Description: [What went wrong]
- Steps to Reproduce: [Exact steps]
- Expected: [What should happen]
- Actual: [What actually happened]
- Screenshot: [If applicable]

Issue #2:
...
```

---

## Quick Diagnostics

### If Mobile Login Fails

```sql
-- Check user account
SELECT
    au.id,
    au.email,
    au.email_confirmed_at,
    u.tenant_id,
    u.role,
    t.name as tenant_name
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
LEFT JOIN public.tenants t ON t.id = u.tenant_id
WHERE au.email = 'YOUR_EMAIL@example.com';

-- Fix if needed:
-- 1. Email not confirmed: Confirm in Supabase Dashboard
-- 2. tenant_id NULL: Run FIX_LOGIN_ISSUE.sql
-- 3. No public.users entry: Run FIX_LOGIN_ISSUE.sql Step 2
```

### If Orders Don't Show

```sql
-- Check assigned orders
SELECT
    o.id,
    o.order_number,
    o.status,
    o.assigned_driver_id,
    o.tenant_id,
    u.email as driver_email,
    u.tenant_id as driver_tenant
FROM orders o
LEFT JOIN users u ON u.id = o.assigned_driver_id
WHERE o.assigned_driver_id = 'YOUR_USER_ID'
OR u.email = 'YOUR_EMAIL@example.com';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'orders';
```

### If Location Not Recording

```javascript
// Check in mobile app console (F12 if web):
// Look for these logs:
console.log("✅ Location tracking started");
console.log("📍 Location updated:", lat, lng);
console.log("💾 Location saved to database");

// If not seeing logs, check:
// 1. LocationService initialization
// 2. Permissions granted
// 3. Network connectivity
```

```sql
-- Check if service is writing to DB
SELECT
    COUNT(*) as location_count,
    MAX(recorded_at) as last_recorded
FROM driver_locations
WHERE driver_id = 'YOUR_USER_ID'
AND recorded_at > NOW() - INTERVAL '1 hour';

-- Should see:
-- location_count > 0
-- last_recorded within last few minutes
```

---

## Next Steps After Testing

### If All Tests Pass ✅

1. Mark todos as complete
2. Proceed with responsive styling
3. Device compatibility testing
4. Prepare for production deployment

### If Tests Fail ❌

1. Document exact failures
2. Prioritize by severity
3. Fix critical issues first
4. Re-test after fixes
5. Don't proceed until core functionality works

---

**Ready to start testing?** 🚀

Run: `cd /workspaces/MobileOrderTracker/MyApp && npm start`
