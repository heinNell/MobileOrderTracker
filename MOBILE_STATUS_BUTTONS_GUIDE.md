# 📱 Mobile App Status Update Buttons - Complete Guide

## How Status Buttons Work

The mobile app shows **only the next valid status transitions** for the current order status. This prevents drivers from skipping steps or setting invalid statuses.

## Status Flow & Available Buttons

### From: `assigned` ✅

**Driver sees:**

- 🟢 **Activate Load** → goes to `activated`
- 🔴 **Cancel Order** → goes to `cancelled`

---

### From: `activated` ✅

**Driver sees:**

- 🟢 **Start Trip** → goes to `in_progress`
- 🟣 **Mark In Transit** → goes to `in_transit`
- 📍 **Arrived at Loading Point** → goes to `arrived_at_loading_point`
- 🔴 **Cancel Order** → goes to `cancelled`

---

### From: `in_progress` ✅

**Driver sees:**

- 🟣 **Mark In Transit** → goes to `in_transit`
- 📍 **Arrived at Loading Point** → goes to `arrived_at_loading_point`
- 🔴 **Cancel Order** → goes to `cancelled`

---

### From: `in_transit` ✅

**Driver sees:**

- 📍 **Arrived at Loading Point** → goes to `arrived_at_loading_point`
- 📍 **Arrived at Unloading Point** → goes to `arrived_at_unloading_point`
- 🟢 **Mark Arrived** → goes to `arrived`
- 🔴 **Cancel Order** → goes to `cancelled`

---

### From: `arrived` ✅

**Driver sees:**

- 🟡 **Start Loading** → goes to `loading`
- 🟡 **Start Unloading** → goes to `unloading`
- ✅ **Mark Delivered** → goes to `delivered`
- 🔴 **Cancel Order** → goes to `cancelled`

---

### From: `arrived_at_loading_point` ⚠️ **CURRENT STATUS?**

**Driver sees:**

- 🟡 **Start Loading** → goes to `loading`
- 🔴 **Cancel Order** → goes to `cancelled`

**This is where your driver probably is!**

---

### From: `loading` ✅

**Driver sees:**

- ✅ **Loading Complete** → goes to `loaded`
- 🔴 **Cancel Order** → goes to `cancelled`

---

### From: `loaded` ✅

**Driver sees:**

- 🟣 **Mark In Transit** → goes to `in_transit` (heading to unloading point)
- 📍 **Arrived at Unloading Point** → goes to `arrived_at_unloading_point`
- 🔴 **Cancel Order** → goes to `cancelled`

---

### From: `arrived_at_unloading_point` ✅

**Driver sees:**

- 🟡 **Start Unloading** → goes to `unloading`
- 🔴 **Cancel Order** → goes to `cancelled`

---

### From: `unloading` ✅

**Driver sees:**

- ✅ **Mark Delivered** → goes to `delivered`
- 🔴 **Cancel Order** → goes to `cancelled`

---

### From: `delivered` ✅

**Driver sees:**

- ✅ **Complete Order** → goes to `completed`

---

### From: `completed` ❌ Final State

**Driver sees:**

- _(No buttons - order is complete)_

---

### From: `cancelled` ❌ Final State

**Driver sees:**

- _(No buttons - order is cancelled)_

---

## Common Issues & Solutions

### Issue 1: "I don't see any buttons to update status"

**Possible Causes:**

1. **Order is in final state** (`completed` or `cancelled`)

   - Solution: No action needed - order is done

2. **Order status is invalid/missing**

   - Solution: Check order status in database
   - Run: `SELECT id, order_number, status FROM orders WHERE id = 'your-order-id'`

3. **You're not the assigned driver**

   - Solution: Only the assigned driver can update status
   - Check: `assigned_driver_id` matches your user ID

4. **StatusUpdateButtons component not rendered**
   - Solution: Check if component is in the UI
   - Look for "Update Order Status" section in order details

---

### Issue 2: "I see buttons but they don't do anything when clicked"

**Possible Causes:**

1. **Network/Database error**

   - Check browser/app console for errors
   - Verify Supabase connection

2. **RLS Policy blocking update**

   - Solution: Verify driver has UPDATE permission on orders table
   - Check policies allow: `assigned_driver_id = auth.uid()`

3. **Missing permissions**
   - Solution: Ensure driver account has proper role
   - Check: `SELECT role FROM users WHERE id = 'your-user-id'`

---

### Issue 3: "Buttons show wrong next steps"

**This should NOT happen** - Status transitions are hardcoded in:

- File: `/MyApp/app/services/StatusUpdateService.js`
- Constant: `STATUS_TRANSITIONS`

If you see wrong buttons, there may be a code bug. Check:

1. Current order status in database
2. STATUS_TRANSITIONS definition matches expected flow
3. StatusUpdateButtons component is getting correct order prop

---

## Typical Delivery Workflow

### Scenario: Full Delivery from Loading to Unloading

```
1. Driver Dashboard → See order with status: assigned
   👆 Click "Activate Load" or scan QR

2. Status becomes: activated
   👆 Click "Arrived at Loading Point"

3. Status becomes: arrived_at_loading_point
   👆 Click "Start Loading"

4. Status becomes: loading
   👆 Click "Loading Complete"

5. Status becomes: loaded
   👆 Click "Mark In Transit"

6. Status becomes: in_transit
   👆 Drive to unloading point
   👆 Click "Arrived at Unloading Point"

7. Status becomes: arrived_at_unloading_point
   👆 Click "Start Unloading"

8. Status becomes: unloading
   👆 Click "Mark Delivered"

9. Status becomes: delivered
   👆 Click "Complete Order"

10. Status becomes: completed ✅
    No more buttons - tracking stops, order finalized
```

---

## Testing Status Buttons

### Manual Test Procedure

1. **Check current status:**

   ```sql
   SELECT order_number, status, assigned_driver_id
   FROM orders
   WHERE id = 'your-order-id';
   ```

2. **Verify expected buttons:**

   - Look up current status in "Status Flow & Available Buttons" above
   - Confirm you see exactly those buttons in the app

3. **Test each button:**

   - Click button
   - Wait for confirmation dialog
   - Check status updated in database
   - Verify new buttons appear for next status

4. **Check console logs:**
   - Look for: `✅ Status updated:` or `❌ Status update failed:`
   - Check for errors from StatusUpdateService

---

## Code Reference

### Where Status Buttons are Shown

1. **Driver Dashboard** (`/MyApp/app/(tabs)/DriverDashboard.js`)

   - Shows for active order only
   - Line: ~1430

2. **Order Details** (`/MyApp/app/(tabs)/[orderId].js`)
   - Shows when viewing specific order
   - Line: ~1023

### Component Code

**File:** `/MyApp/app/components/order/StatusUpdateButtons.js`

**Key Logic:**

```javascript
// Get available transitions for current status
const availableTransitions = StatusUpdateService.getAvailableTransitions(
  order?.status
);

// Filter out current status
const filteredTransitions = availableTransitions.filter(
  (status) => status !== order?.status
);

// Render button for each valid next status
{
  filteredTransitions.map((status) => (
    <Pressable onPress={() => handleStatusPress(status)}>
      <Text>{STATUS_INFO[status]?.label}</Text>
    </Pressable>
  ));
}
```

---

## Debugging Checklist

If status buttons aren't working, check:

- [ ] Order is assigned to you: `assigned_driver_id = your_user_id`
- [ ] Order is not in final state: `status NOT IN ('completed', 'cancelled')`
- [ ] StatusUpdateButtons component is rendered (look for "Update Order Status")
- [ ] Browser/app console shows no errors
- [ ] Database connection works (other data loads)
- [ ] RLS policies allow UPDATE: Run `FIX_STATUS_UPDATES_SCHEMA.sql`
- [ ] Status transitions defined for current status (check STATUS_TRANSITIONS)

---

## Quick Fix: Reset Order Status (Testing Only)

**⚠️ Only use this for testing! Don't use on production orders!**

```sql
-- Reset order to activated status for testing
UPDATE orders
SET status = 'activated',
    updated_at = NOW()
WHERE id = 'your-order-id'
  AND assigned_driver_id = 'your-user-id';

-- Verify
SELECT order_number, status FROM orders WHERE id = 'your-order-id';
```

After this, you should see buttons for:

- Start Trip
- Mark In Transit
- Arrived at Loading Point
- Cancel Order

---

## Summary

✅ **Status buttons AUTOMATICALLY show based on current status**
✅ **Only valid next steps are available (prevents errors)**
✅ **StatusUpdateService handles all validation and database updates**
✅ **Each status has 1-4 possible next statuses**

If you don't see buttons, the most likely reason is:

1. Order status is `completed` or `cancelled` (final states)
2. You're not the assigned driver for this order
3. Component isn't rendered in the current view

Check the status flow chart above to see what buttons should appear for your current order status!
