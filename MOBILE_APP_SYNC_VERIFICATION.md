# Mobile App Driver Sync & Live Tracking Verification

## Overview
This document provides verification steps to ensure the mobile app properly syncs driver data, tracks location, and updates order status in real-time after the database fix is applied.

## Root Cause Recap
**Problem**: The `sync_user_from_auth()` trigger was overwriting `tenant_id` with NULL, causing drivers to disappear from the dashboard after creation or assignment.

**Solution**: Fixed the trigger to preserve `tenant_id` and restored all NULL values from the `drivers` table.

---

## 1. Driver Authentication & Login

### Mobile App Login Flow
```typescript
// MyApp should use Supabase auth
const { data, error } = await supabase.auth.signInWithPassword({
  email: driverEmail,
  password: driverPassword,
});

// After login, fetch driver profile
const { data: driverProfile } = await supabase
  .from('users')
  .select('*, drivers(*)')
  .eq('id', data.user.id)
  .eq('role', 'driver')
  .single();
```

### Verification Steps
1. ✅ Driver can log in with email/password created by dashboard
2. ✅ Driver profile loads with correct `tenant_id`
3. ✅ Driver can see their assigned orders
4. ✅ No "Unauthorized" or "Row Level Security" errors

---

## 2. Driver Order Assignment

### Dashboard Assignment Flow
```typescript
// Dashboard assigns driver to order
const { error } = await supabase
  .from('orders')
  .update({ 
    assigned_driver_id: driverId,
    status: 'assigned',
    updated_at: new Date().toISOString()
  })
  .eq('id', orderId)
  .eq('tenant_id', tenantId); // Tenant isolation
```

### Mobile App Order Fetching
```typescript
// Mobile app fetches assigned orders
const { data: orders } = await supabase
  .from('orders')
  .select(`
    *,
    users:assigned_driver_id (
      id,
      full_name,
      phone,
      email
    )
  `)
  .eq('assigned_driver_id', driverId)
  .eq('tenant_id', tenantId)
  .in('status', ['assigned', 'in_transit', 'at_pickup', 'at_delivery'])
  .order('created_at', { ascending: false });
```

### Verification Steps
1. ✅ Dashboard shows all 13 drivers in assignment dropdown
2. ✅ Can assign driver to order without driver disappearing
3. ✅ Mobile app receives assigned order immediately
4. ✅ Driver can see order details (pickup, delivery locations)
5. ✅ Driver remains visible in dashboard after assignment

---

## 3. Real-Time Location Tracking

### Mobile App Location Updates
```typescript
// Mobile app sends location updates
const updateLocation = async (latitude: number, longitude: number) => {
  const { error } = await supabase
    .from('driver_locations')
    .upsert({
      driver_id: driverId,
      location: `POINT(${longitude} ${latitude})`, // PostGIS format
      updated_at: new Date().toISOString(),
      tenant_id: tenantId
    });
  
  if (error) {
    console.error('Location update failed:', error);
  }
};

// Update location every 30 seconds while on duty
const locationInterval = setInterval(() => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      updateLocation(
        position.coords.latitude,
        position.coords.longitude
      );
    });
  }
}, 30000);
```

### Dashboard Real-Time Subscription
```typescript
// Dashboard subscribes to location updates
const channel = supabase
  .channel('driver_locations')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'driver_locations',
      filter: `tenant_id=eq.${tenantId}`
    },
    (payload) => {
      // Update map marker with new location
      updateDriverMarker(payload.new);
    }
  )
  .subscribe();
```

### Verification Steps
1. ✅ Mobile app successfully uploads location every 30 seconds
2. ✅ Dashboard map shows driver location in real-time
3. ✅ Location updates respect tenant isolation (no cross-tenant visibility)
4. ✅ Driver location persists across app restarts
5. ✅ No RLS policy violations when updating location

---

## 4. Order Status Updates

### Mobile App Status Update Flow
```typescript
// Driver updates order status
const updateOrderStatus = async (orderId: string, newStatus: string) => {
  const { error } = await supabase
    .from('orders')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
      // Add status-specific fields
      ...(newStatus === 'in_transit' && { picked_up_at: new Date().toISOString() }),
      ...(newStatus === 'delivered' && { delivered_at: new Date().toISOString() })
    })
    .eq('id', orderId)
    .eq('assigned_driver_id', driverId); // Driver can only update their orders
};
```

### Dashboard Status Monitoring
```typescript
// Dashboard subscribes to order updates
const channel = supabase
  .channel('order_updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'orders',
      filter: `tenant_id=eq.${tenantId}`
    },
    (payload) => {
      // Update order list with new status
      updateOrderInList(payload.new);
      
      // Show notification
      toast.success(`Order ${payload.new.order_number} updated to ${payload.new.status}`);
    }
  )
  .subscribe();
```

### Verification Steps
1. ✅ Driver can update order status (assigned → in_transit → at_pickup → at_delivery → delivered)
2. ✅ Dashboard receives status updates in real-time
3. ✅ Status timeline shows all transitions with timestamps
4. ✅ Order list automatically updates without refresh
5. ✅ Notifications appear for status changes

---

## 5. Complete Integration Test Checklist

### Pre-Test: Apply Database Fix
- [ ] Execute `FIX_ALL_MISSING_DRIVERS.sql` in Supabase SQL Editor
- [ ] Verify all 13 drivers show in dashboard
- [ ] Check `broken_driver_accounts` view returns 0 rows

### Dashboard Tests
- [ ] Login as admin user
- [ ] Navigate to Drivers page
- [ ] Verify all 13 drivers appear in list
- [ ] Create new test driver
- [ ] Verify new driver appears immediately
- [ ] Navigate to Orders page
- [ ] Create new order
- [ ] Verify driver dropdown shows all drivers (including newly created)
- [ ] Assign driver to order
- [ ] Verify driver still visible in Drivers page (doesn't disappear)
- [ ] Verify order shows assigned driver name

### Mobile App Tests
- [ ] Install/open mobile app
- [ ] Login with driver credentials (use email + temp password from dashboard)
- [ ] Verify driver profile loads
- [ ] Verify assigned orders appear in list
- [ ] Select an order
- [ ] Verify order details (pickup, delivery locations)
- [ ] Update order status to "in_transit"
- [ ] Verify status updates successfully
- [ ] Enable location tracking
- [ ] Verify location updates sent (check console logs)

### Dashboard Real-Time Tests
- [ ] Open dashboard while mobile app is active
- [ ] Watch map for driver location updates (should update ~every 30 seconds)
- [ ] Mobile app: Update order status
- [ ] Dashboard: Verify order status updates without refresh
- [ ] Dashboard: Check order timeline shows new status
- [ ] Dashboard: Verify notification appears

### Cross-User Tests
- [ ] Create second tenant/admin user
- [ ] Login with second tenant
- [ ] Verify CANNOT see drivers from first tenant
- [ ] Verify CANNOT see orders from first tenant
- [ ] Verify location tracking isolated per tenant

---

## 6. Troubleshooting Common Issues

### Issue: Driver can't see assigned orders
**Cause**: RLS policy blocking access or `tenant_id` mismatch

**Fix**:
```sql
-- Check driver's tenant_id matches order's tenant_id
SELECT 
    u.id as driver_id,
    u.tenant_id as driver_tenant_id,
    o.id as order_id,
    o.tenant_id as order_tenant_id,
    CASE 
        WHEN u.tenant_id = o.tenant_id THEN '✅ Match'
        ELSE '❌ Mismatch'
    END as status
FROM users u
INNER JOIN orders o ON o.assigned_driver_id = u.id
WHERE u.role = 'driver';
```

### Issue: Location updates fail with RLS error
**Cause**: Missing `tenant_id` in location update or wrong RLS policy

**Fix**:
```sql
-- Ensure driver_locations table has proper RLS
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can update own location" ON driver_locations;

CREATE POLICY "Drivers can update own location"
ON driver_locations
FOR ALL
USING (driver_id = auth.uid())
WITH CHECK (driver_id = auth.uid());
```

### Issue: Dashboard doesn't show real-time updates
**Cause**: Realtime subscription not set up or channel not subscribed

**Fix**:
```typescript
// Check Supabase realtime is enabled in project settings
// Enable realtime on tables: orders, driver_locations, users

// Verify subscription status
channel.subscribe((status) => {
  console.log('Realtime status:', status);
});
```

### Issue: Driver disappears after assignment (OLD BUG)
**Cause**: `sync_user_from_auth()` trigger overwrites `tenant_id` with NULL

**Fix**: Already fixed in `FIX_ALL_MISSING_DRIVERS.sql`

---

## 7. Performance Optimization

### Mobile App Location Batching
Instead of individual updates, batch location points:
```typescript
const locationBuffer: LocationPoint[] = [];

const flushLocationBuffer = async () => {
  if (locationBuffer.length === 0) return;
  
  const { error } = await supabase
    .from('driver_location_history')
    .insert(locationBuffer);
  
  if (!error) {
    locationBuffer.length = 0;
  }
};

// Flush every 5 minutes or 10 points
setInterval(flushLocationBuffer, 5 * 60 * 1000);
```

### Dashboard Query Optimization
Use views for common queries:
```sql
CREATE VIEW active_drivers_with_locations AS
SELECT 
    u.id,
    u.full_name,
    u.phone,
    u.email,
    u.tenant_id,
    d.license_number,
    d.license_expiry,
    dl.location,
    dl.updated_at as last_location_update,
    COUNT(o.id) as active_orders
FROM users u
INNER JOIN drivers d ON d.id = u.id
LEFT JOIN driver_locations dl ON dl.driver_id = u.id
LEFT JOIN orders o ON o.assigned_driver_id = u.id 
    AND o.status IN ('assigned', 'in_transit', 'at_pickup', 'at_delivery')
WHERE u.role = 'driver' AND u.is_active = true
GROUP BY u.id, u.full_name, u.phone, u.email, u.tenant_id, 
         d.license_number, d.license_expiry, dl.location, dl.updated_at;
```

---

## 8. Success Criteria

✅ **All systems operational when:**
1. All 13 drivers visible in dashboard
2. New drivers can be created without issues
3. Drivers don't disappear after order assignment
4. Mobile app can authenticate and fetch assigned orders
5. Location updates appear on dashboard map in real-time
6. Order status updates sync between mobile and dashboard
7. Multi-tenant isolation working (no cross-tenant data leakage)
8. No RLS policy violations in logs
9. `broken_driver_accounts` view returns 0 rows
10. Dashboard and mobile app communicate bidirectionally

---

## 9. Next Steps After Verification

1. **Monitor Production**:
   - Set up alert if `broken_driver_accounts` view returns any rows
   - Log all RLS policy violations
   - Track location update frequency and success rate

2. **Documentation**:
   - Update driver onboarding guide with login credentials
   - Create troubleshooting runbook for support team
   - Document mobile app setup for new drivers

3. **Future Enhancements**:
   - Add driver status (available, on_break, offline)
   - Implement route optimization
   - Add proof of delivery (signature, photo)
   - Push notifications for new order assignments

4. **Database Maintenance**:
   - Set up scheduled job to check `broken_driver_accounts`
   - Archive old location history (keep last 30 days)
   - Monitor trigger performance impact

---

## Support Contacts

**Database Issues**: Check `COMPLETE_DIAGNOSIS_DRIVER_ISSUE.md`
**RLS Policies**: Run `VERIFY_RLS_POLICIES.sql`
**Driver Fix**: Execute `FIX_ALL_MISSING_DRIVERS.sql`

**Emergency Rollback** (if fix causes issues):
```sql
-- Remove the new trigger
DROP TRIGGER IF EXISTS sync_user_trigger ON public.users;

-- Re-enable old function temporarily
-- (Check git history for original function)
```
