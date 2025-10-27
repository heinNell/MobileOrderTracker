# Status Update Troubleshooting Guide

## Issue: Can't Update Order Status on Mobile App

### Steps to Diagnose and Fix

#### 1. Run Diagnostics

First, run the diagnostic SQL script in your Supabase SQL Editor:

```bash
File: DIAGNOSE_STATUS_UPDATES.sql
```

This will check:

- Table schemas (status_updates, orders, order_status_history)
- RLS policies
- Recent data
- Enum values

#### 2. Check Console Logs

Open your browser console (F12) or React Native debugger and look for these log messages when you try to update status:

**Expected Flow:**

```
🎯 Handling status update: { orderId: "...", newStatus: "...", note: "..." }
📞 Calling statusUpdateServiceInstance.updateOrderStatus...
🔄 Status Update Request: { orderId: "...", newStatus: "...", ... }
📱 Fetching current user... (if first time)
✅ User authenticated: ...
📦 Fetching order data...
📦 Order data: { currentStatus: "...", assignedDriverId: "...", currentUserId: "..." }
💾 Updating order status in database...
✅ Order status updated successfully
💾 Creating status history record...
✅ Status history record created
💾 Creating status update record...
✅ Status update record created
🎉 Status update completed successfully!
📊 Status update result: { success: true, ... }
✅ Status updated successfully
```

**Common Errors to Look For:**

| Error Message                                                 | Likely Cause                             | Solution                      |
| ------------------------------------------------------------- | ---------------------------------------- | ----------------------------- |
| `❌ User not authenticated`                                   | Not logged in                            | Check login state             |
| `❌ Driver not authorized`                                    | User ID doesn't match assigned_driver_id | Check order assignment        |
| `❌ Invalid transition`                                       | Status flow violation                    | Check STATUS_TRANSITIONS      |
| `❌ Order update failed: new row violates row-level security` | RLS policy blocking UPDATE               | Run FIX_STATUS_UPDATE_RLS.sql |
| `⚠️ Failed to create status update record: permission denied` | RLS policy blocking INSERT               | Run FIX_STATUS_UPDATE_RLS.sql |

#### 3. Fix RLS Policies

If you see RLS errors, run this script in Supabase SQL Editor:

```bash
File: FIX_STATUS_UPDATE_RLS.sql
```

This script will:

- Enable RLS on status_updates table
- Create policies for drivers to INSERT their status updates
- Create policies for drivers to UPDATE their assigned orders
- Create policies for order_status_history table

#### 4. Verify Status Buttons Are Showing

Check if buttons appear on the screen:

```
🔄 Available transitions: { currentStatus: "...", availableTransitions: [...] }
```

If `availableTransitions` is empty, the buttons won't show!

**Check STATUS_TRANSITIONS in StatusUpdateService.js:**

- Each status should have valid next states
- Example: `in_transit` can transition to `arrived_at_loading_point`, `arrived_at_unloading_point`, `arrived`, or `cancelled`

#### 5. Common Issues and Solutions

**Issue: No buttons showing up**

- **Check:** Console log for "Available transitions"
- **Cause:** Current status has no valid transitions
- **Solution:** Verify order.status matches a key in STATUS_TRANSITIONS

**Issue: Buttons show but nothing happens when clicked**

- **Check:** Console logs when clicking button
- **Cause:** Event handler not firing
- **Solution:** Check if `disabled={loading}` is preventing clicks

**Issue: "Invalid status transition" error**

- **Check:** Current status and requested status
- **Cause:** Status flow violation (e.g., trying to go from `pending` to `delivered`)
- **Solution:** Follow the correct status flow:
  ```
  assigned → activated → in_transit → arrived_at_loading_point →
  loading → loaded → in_transit → arrived_at_unloading_point →
  unloading → delivered → completed
  ```

**Issue: "Driver not authorized" error**

- **Check:** Console log showing assignedDriverId vs currentUserId
- **Cause:** Order not assigned to current user
- **Solution:** Ensure the order's `assigned_driver_id` matches the logged-in user's ID

**Issue: "Permission denied" or RLS errors**

- **Check:** Diagnostic SQL results for RLS policies
- **Cause:** Missing or incorrect RLS policies
- **Solution:** Run `FIX_STATUS_UPDATE_RLS.sql`

#### 6. Manual Testing Steps

1. **Log in to mobile app** as a driver
2. **Activate an assigned order** (if not already active)
3. **Open browser console** (F12 → Console tab)
4. **Try to update status** (e.g., click "In Transit" button)
5. **Watch console logs** for the flow shown above
6. **Check for errors** and match them to the table above

#### 7. Database Verification

After running the fix scripts, verify in Supabase:

```sql
-- Check if driver can see their orders
SELECT id, order_number, status, assigned_driver_id
FROM orders
WHERE assigned_driver_id = auth.uid();

-- Check if driver can insert status updates
INSERT INTO status_updates (order_id, driver_id, user_id, status, notes)
VALUES (
  '<your-order-id>',
  auth.uid(),
  auth.uid(),
  'in_transit',
  'Test from SQL editor'
);

-- If above works, the RLS is configured correctly!
```

#### 8. Mobile App Specific Checks

**For React Native (Expo):**

- Reload the app after code changes: shake device → "Reload"
- Clear app cache if needed
- Check that StatusUpdateService is initialized: `statusUpdateServiceInstance.initialize(user)`

**For Web:**

- Hard refresh: Ctrl+Shift+R or Cmd+Shift+R
- Clear browser cache
- Check Network tab for failed API calls

#### 9. Still Not Working?

If status updates still fail after all above steps:

1. **Export diagnostic results:**

   ```sql
   -- Run DIAGNOSE_STATUS_UPDATES.sql and copy all results
   ```

2. **Copy console logs:**

   - Right-click in console → "Save as..."
   - Or copy/paste the error messages

3. **Check current order data:**

   ```sql
   SELECT * FROM orders WHERE id = '<your-order-id>';
   ```

4. **Verify user authentication:**
   ```javascript
   const {
     data: { user },
   } = await supabase.auth.getUser();
   console.log("Current user:", user);
   ```

### Quick Fix Checklist

- [ ] Run `DIAGNOSE_STATUS_UPDATES.sql` in Supabase SQL Editor
- [ ] Run `FIX_STATUS_UPDATE_RLS.sql` in Supabase SQL Editor
- [ ] Check console logs for detailed error messages
- [ ] Verify order is assigned to current user
- [ ] Verify status transition is valid (check STATUS_TRANSITIONS)
- [ ] Reload mobile app / refresh browser
- [ ] Test with a simple transition (e.g., assigned → activated)

### Expected Behavior After Fix

1. Status update buttons appear below order details
2. Buttons show valid next statuses based on current status
3. Clicking a button shows confirmation dialog (for most statuses)
4. After confirmation, status updates immediately
5. Success message appears: "Order status updated to [New Status]"
6. Order details refresh showing new status
7. Dashboard also shows updated status (realtime sync)
