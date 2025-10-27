# Test Status Update Flow

## RLS Policies ✅ VERIFIED

Your RLS policies are correctly configured:

### Orders Table

- ✅ `Drivers can update their assigned orders` (UPDATE, authenticated)
- ✅ Multiple SELECT policies for viewing orders
- ✅ UPDATE policies for authenticated users

### Status_Updates Table

- ✅ `Drivers can insert their own status updates` (INSERT, authenticated) - **DUPLICATE**
- ✅ `Drivers can view their own status updates` (SELECT, authenticated) - **DUPLICATE**
- ✅ `Admins can view all status updates` (SELECT, authenticated)

**Note**: You have duplicate policies for status_updates (two INSERT, two SELECT). This won't break functionality but you might want to clean them up later.

---

## Quick Test in Browser Console

Since the RLS is fine, let's test the actual flow. Open your mobile app in the browser and run this in the console (F12):

### Step 1: Check Authentication

```javascript
const {
  data: { user },
  error,
} = await supabase.auth.getUser();
console.log("Current user:", user);
console.log("User ID:", user?.id);
```

**Expected**: Should show your user object with an ID

---

### Step 2: Check Active Order

Find your active order and verify assignment:

```javascript
// Replace with your actual order ID
const orderId = "YOUR_ORDER_ID_HERE";

const { data: order, error } = await supabase
  .from("orders")
  .select("id, order_number, status, assigned_driver_id")
  .eq("id", orderId)
  .single();

console.log("Order:", order);
console.log("Assigned to:", order.assigned_driver_id);
console.log("Current user:", user.id);
console.log("Match?", order.assigned_driver_id === user.id);
```

**Expected**:

- Order should exist
- `assigned_driver_id` should match your user ID
- Match should be `true`

**If Match is false**: This is your problem! The order isn't assigned to you.

---

### Step 3: Check Available Transitions

```javascript
import { STATUS_TRANSITIONS } from "./app/services/StatusUpdateService";

console.log("Current status:", order.status);
console.log("Available transitions:", STATUS_TRANSITIONS[order.status]);
```

**Expected**: Should show an array of valid next statuses

**If empty array**: The current status has no valid transitions (might be `completed` or `cancelled`)

---

### Step 4: Test Status Update Directly

```javascript
// Choose a valid next status from the transitions above
const newStatus = "in_transit"; // Or another valid status

const { data: updated, error: updateError } = await supabase
  .from("orders")
  .update({
    status: newStatus,
    updated_at: new Date().toISOString(),
  })
  .eq("id", orderId)
  .select()
  .single();

if (updateError) {
  console.error("❌ Update failed:", updateError);
} else {
  console.log("✅ Order updated:", updated);
}
```

**Expected**: Order status should update successfully

**If error**: Note the error message and code

---

### Step 5: Test Status Update Insert

```javascript
const { data: statusUpdate, error: insertError } = await supabase
  .from("status_updates")
  .insert({
    order_id: orderId,
    driver_id: user.id,
    user_id: user.id,
    status: newStatus,
    notes: "Test from console",
  })
  .select()
  .single();

if (insertError) {
  console.error("❌ Status update insert failed:", insertError);
} else {
  console.log("✅ Status update created:", statusUpdate);
}
```

**Expected**: Should create a status_updates record

---

## Most Common Issues & Solutions

### Issue 1: Order Not Assigned to Current User

**Symptoms**:

- Console shows: `❌ Driver not authorized`
- Match is `false` in Step 2

**Solution**:

```sql
-- In Supabase SQL Editor, assign the order to yourself
UPDATE orders
SET assigned_driver_id = auth.uid()
WHERE id = 'YOUR_ORDER_ID';
```

### Issue 2: StatusUpdateButtons Not Visible

**Symptoms**: No buttons showing on the screen

**Check**:

1. Is there an active order? (`activeOrder` should not be null)
2. Are there available transitions? (Check console for "Available transitions")
3. Is the component rendered? (Search page for "Update Order Status" text)

**Solution**: Make sure the order status has valid next states in `STATUS_TRANSITIONS`

### Issue 3: Buttons Show But Don't Work

**Symptoms**: Buttons visible but clicking does nothing

**Check console for**:

- `🎯 Handling status update` - Should appear when clicking
- Any error messages

**Common causes**:

- `disabled={loading}` prop preventing clicks
- Event handler not attached
- JavaScript error preventing execution

### Issue 4: Invalid Status Transition

**Symptoms**: Error message "Invalid status transition from X to Y"

**Solution**: Follow the correct flow. Here's the typical order workflow:

```
pending → assigned → activated → in_transit →
arrived_at_loading_point → loading → loaded →
in_transit → arrived_at_unloading_point →
unloading → delivered → completed
```

You can also check `STATUS_TRANSITIONS` in `StatusUpdateService.js` for the complete map.

---

## Watch Console Logs When Clicking Button

With the enhanced logging I added, you should see this flow:

```
🔄 Available transitions: { currentStatus: "assigned", availableTransitions: ["activated", "cancelled"] }
🎯 Handling status update: { orderId: "...", newStatus: "activated", note: null }
📞 Calling statusUpdateServiceInstance.updateOrderStatus...
🔄 Status Update Request: { orderId: "...", newStatus: "activated" }
✅ User authenticated: abc-123-def-456
📦 Fetching order data...
📦 Order data: { currentStatus: "assigned", assignedDriverId: "abc-123", currentUserId: "abc-123" }
💾 Updating order status in database...
✅ Order status updated successfully
💾 Creating status history record...
✅ Status history record created
💾 Creating status update record...
✅ Status update record created
🎉 Status update completed successfully!
```

**Copy and share any error messages you see!** The emojis make it easy to spot where it fails.

---

## Emergency Bypass (Testing Only)

If you need to update status immediately for testing, you can do it directly in Supabase:

```sql
-- Update order status
UPDATE orders
SET status = 'in_transit', updated_at = NOW()
WHERE id = 'YOUR_ORDER_ID';

-- Create status update record
INSERT INTO status_updates (order_id, driver_id, user_id, status, notes)
VALUES ('YOUR_ORDER_ID', 'YOUR_USER_ID', 'YOUR_USER_ID', 'in_transit', 'Manual update');
```

But this won't help diagnose why the mobile app isn't working!
