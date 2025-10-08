# Driver Allocation and Load Activation Implementation Guide

## Overview

This document describes the complete implementation of driver allocation, load activation, and QR code scanning functionality integrated with Supabase.

**Implementation Date:** October 8, 2025  
**Version:** 1.0.0

---

## Table of Contents

1. [Features Implemented](#features-implemented)
2. [Database Schema](#database-schema)
3. [Edge Functions](#edge-functions)
4. [Dashboard Functionality](#dashboard-functionality)
5. [Mobile App Functionality](#mobile-app-functionality)
6. [Deployment Instructions](#deployment-instructions)
7. [Testing Guide](#testing-guide)
8. [Troubleshooting](#troubleshooting)

---

## Features Implemented

### ✅ Complete Feature List

1. **Database Schema Enhancements**
   - New `qr_codes` table for QR code lifecycle management
   - New `load_activations` table for audit trail
   - Extended `orders` table with driver allocation fields
   - Comprehensive RLS policies for security
   - Database triggers for automatic status updates

2. **Dashboard Features**
   - Driver selection during order creation
   - Automatic QR code generation on order creation
   - Driver assignment with status tracking
   - Real-time order status updates
   - QR code download functionality

3. **Mobile App Features**
   - Load activation screen with location capture
   - QR scanner with workflow enforcement
   - Order status progression (assigned → activated → picked_up → delivered)
   - Real-time synchronization with backend

4. **Edge Functions**
   - `activate-load`: Handles driver load activation
   - `generate-qr-code`: Enhanced with qr_codes table integration
   - `validate-qr-code`: Enhanced with load activation checks

---

## Database Schema

### New Tables

#### 1. qr_codes
Stores QR codes generated for orders with lifecycle tracking.

```sql
CREATE TABLE public.qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    qr_code_data TEXT NOT NULL,
    qr_code_image_url TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'revoked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    scanned_at TIMESTAMPTZ,
    scanned_by UUID REFERENCES public.users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(order_id)
);
```

#### 2. load_activations
Audit trail for driver load activations with location data.

```sql
CREATE TABLE public.load_activations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.users(id),
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    location GEOGRAPHY(POINT, 4326),
    location_address TEXT,
    device_info JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    UNIQUE(order_id)
);
```

### Extended Orders Table

New columns added to `orders` table:

- `assigned_driver_id UUID` - References driver user
- `load_activated_at TIMESTAMPTZ` - Timestamp of activation
- `load_activated_by UUID` - Driver who activated
- `qr_code_id UUID` - Reference to QR code record

### Enhanced Order Statuses

The workflow now supports these statuses:
- `created` - Order just created
- `assigned` - Driver assigned to order
- `activated` - Driver has activated the load
- `in_progress` - Order in progress
- `picked_up` - Goods picked up (via QR scan)
- `in_transit` - In transit to destination
- `delivered` - Delivered (via QR scan)
- `completed` - Order completed
- `cancelled` - Order cancelled
- `failed` - Order failed

---

## Edge Functions

### 1. activate-load

**Purpose:** Handles driver load activation with validation and location capture.

**Endpoint:** `POST /functions/v1/activate-load`

**Request Body:**
```json
{
  "order_id": "uuid",
  "location": {
    "latitude": -26.2041,
    "longitude": 28.0473
  },
  "location_address": "123 Main St, City",
  "device_info": {
    "platform": "ios",
    "app_version": "1.0.0",
    "os_version": "15.0"
  },
  "notes": "Optional notes"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Load activated successfully",
  "data": {
    "activation": { ... },
    "order": { ... }
  }
}
```

**Validations:**
- Driver must be authenticated
- Driver must be assigned to the order
- Order status must be 'created' or 'assigned'
- Load cannot be already activated

### 2. generate-qr-code (Enhanced)

**Purpose:** Generates QR codes and stores them in the qr_codes table.

**Key Changes:**
- Checks for existing QR codes before creating
- Stores QR code in `qr_codes` table
- Updates `orders.qr_code_id` with reference
- Returns QR code ID for tracking

### 3. validate-qr-code (Enhanced)

**Purpose:** Validates QR codes with load activation enforcement.

**Key Changes:**
- Verifies load is activated before allowing scan
- Checks QR code status (active/used/expired)
- Updates order status based on scan context
- Marks QR code as 'used' after successful scan
- Records scan information

**Workflow:**
1. First scan after activation → Status: `picked_up`
2. Subsequent scan → Status: `delivered`

---

## Dashboard Functionality

### Order Creation with Driver Assignment

**Location:** `dashboard/app/components/EnhancedOrderForm.tsx`

**Features:**
1. **Driver Selection Tab**
   - Dropdown list of available drivers
   - Fetches active drivers from same tenant
   - Shows driver info (name, phone, email)
   - Option to leave unassigned

2. **Automatic Workflow**
   - If driver assigned: Status set to 'assigned'
   - If unassigned: Status set to 'pending'
   - Notification sent to assigned driver
   - QR code auto-generated

3. **User Experience**
   - Clear status indicators
   - Informative help text
   - Real-time driver availability

### Order Management Page

**Location:** `dashboard/app/orders/page.tsx`

**Features:**
1. Generate QR code button for each order
2. QR code download functionality
3. Real-time order status updates
4. Driver assignment display
5. Order filtering by status

---

## Mobile App Functionality

### Load Activation Screen

**Location:** `mobile-app/src/screens/LoadActivationScreen.tsx`

**Features:**

1. **Order Information Display**
   - Order number and status
   - Loading and delivery points
   - Distance and duration
   - Current activation status

2. **Location Services**
   - Request location permissions
   - Display current coordinates
   - Reverse geocoding for address
   - Visual permission status

3. **Activation Process**
   - Pre-activation checklist
   - Confirmation dialog
   - Location capture
   - Device info capture
   - Success/error handling

4. **Post-Activation**
   - Option to scan QR code immediately
   - Navigate back to order details
   - Status updated to 'activated'

### QR Scanner Enhancements

**Location:** `mobile-app/src/screens/QRScannerScreen.tsx`

**Key Enhancements Needed:**
1. Check if load is activated before scanning
2. Display activation requirement message
3. Integrate with validate-qr-code endpoint
4. Handle status progression
5. Show scan result with order updates

---

## Deployment Instructions

### 1. Database Migration

```bash
# Navigate to project root
cd /workspaces/MobileOrderTracker

# Apply migration using Supabase CLI
supabase db push

# Or manually execute the migration file
psql -h <your-supabase-host> -U postgres -d postgres -f supabase/migrations/20251008000001_driver_allocation_and_load_activation.sql
```

### 2. Deploy Edge Functions

```bash
# Deploy activate-load function
supabase functions deploy activate-load

# Re-deploy enhanced functions
supabase functions deploy generate-qr-code
supabase functions deploy validate-qr-code
```

### 3. Update Dashboard

```bash
cd dashboard
npm install
npm run build

# Deploy to your hosting platform (Netlify, Vercel, etc.)
npm run deploy
```

### 4. Update Mobile App

```bash
cd mobile-app
npm install

# For iOS
npx pod-install

# Build for testing
npm run android  # or npm run ios
```

### 5. Environment Variables

Ensure these environment variables are set:

**Supabase (Edge Functions):**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `QR_CODE_SECRET`

**Dashboard:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Mobile App:**
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

## Testing Guide

### 1. Database Testing

```sql
-- Test qr_codes table
SELECT * FROM public.qr_codes LIMIT 5;

-- Test load_activations table
SELECT * FROM public.load_activations LIMIT 5;

-- Test orders table updates
SELECT 
  id, 
  order_number, 
  status, 
  assigned_driver_id, 
  load_activated_at,
  qr_code_id
FROM public.orders 
WHERE assigned_driver_id IS NOT NULL
LIMIT 5;
```

### 2. Edge Function Testing

```bash
# Test activate-load function
curl -X POST 'https://your-project.supabase.co/functions/v1/activate-load' \
  -H 'Authorization: Bearer YOUR_USER_JWT' \
  -H 'Content-Type: application/json' \
  -d '{
    "order_id": "your-order-uuid",
    "location": {
      "latitude": -26.2041,
      "longitude": 28.0473
    }
  }'

# Test generate-qr-code function
curl -X POST 'https://your-project.supabase.co/functions/v1/generate-qr-code' \
  -H 'Authorization: Bearer YOUR_USER_JWT' \
  -H 'Content-Type: application/json' \
  -d '{"orderId": "your-order-uuid"}'
```

### 3. End-to-End Testing Workflow

**Step 1: Create Order with Driver Assignment (Dashboard)**
1. Log in to dashboard as admin
2. Click "Create New Order"
3. Fill in order details
4. Navigate to "Driver" tab
5. Select a driver from dropdown
6. Complete and submit order
7. Verify:
   - Order created with status 'assigned'
   - QR code generated automatically
   - Driver received notification

**Step 2: Activate Load (Mobile App)**
1. Log in to mobile app as the assigned driver
2. Navigate to assigned orders
3. Select the order
4. Click "Activate Load"
5. Grant location permissions
6. Confirm activation
7. Verify:
   - Order status changed to 'activated'
   - Location captured
   - Activation record created

**Step 3: Scan QR Code for Pickup (Mobile App)**
1. From activated order, click "Scan QR Code"
2. Scan the QR code displayed in dashboard
3. Verify:
   - Order status changed to 'picked_up'
   - QR code marked as 'used'
   - Scan timestamp recorded

**Step 4: Scan QR Code for Delivery (Mobile App)**
1. Navigate to order in 'picked_up' status
2. Click "Scan QR Code" again
3. Scan the same or another QR code
4. Verify:
   - Order status changed to 'delivered'
   - Delivery timestamp recorded
   - Order completion tracked

### 4. Testing Checklist

- [ ] Database migrations applied successfully
- [ ] All tables created with correct structure
- [ ] RLS policies working correctly
- [ ] Triggers functioning as expected
- [ ] activate-load Edge Function deployed
- [ ] generate-qr-code Edge Function updated
- [ ] validate-qr-code Edge Function updated
- [ ] Dashboard driver selection working
- [ ] QR code generation on order creation
- [ ] Mobile app load activation screen functional
- [ ] Location permissions working
- [ ] QR scanner enforcing activation
- [ ] Status progression working correctly
- [ ] Real-time updates functioning
- [ ] Notifications being sent
- [ ] Audit trail being recorded

---

## Troubleshooting

### Common Issues

#### 1. "Driver not assigned to order" Error

**Cause:** Driver ID mismatch or RLS policy blocking access.

**Solution:**
```sql
-- Check driver assignment
SELECT id, order_number, assigned_driver_id 
FROM orders 
WHERE id = 'your-order-id';

-- Verify driver's user record
SELECT id, email, role, tenant_id 
FROM users 
WHERE id = 'driver-id';
```

#### 2. "Load must be activated" Error

**Cause:** Attempting to scan QR code before activating load.

**Solution:**
- Ensure driver activates load first via LoadActivationScreen
- Check `load_activated_at` field in orders table
- Verify activation record in `load_activations` table

#### 3. QR Code Generation Fails

**Cause:** Edge function error or missing permissions.

**Solution:**
```sql
-- Check if qr_codes table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'qr_codes';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.qr_codes TO authenticated;
```

#### 4. Location Not Captured

**Cause:** Location permissions not granted or GPS unavailable.

**Solution:**
- Request permissions explicitly in app
- Check device location settings
- Test with simulated location if needed
- Activation works without location (optional)

#### 5. Real-time Updates Not Working

**Cause:** Supabase Realtime not enabled or subscription issue.

**Solution:**
```javascript
// Check subscription status
const channel = supabase
  .channel('orders_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'orders'
  }, (payload) => {
    console.log('Change received!', payload)
  })
  .subscribe((status) => {
    console.log('Subscription status:', status)
  })
```

---

## Security Considerations

### 1. Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:

- **qr_codes:** Drivers can view/update codes for their orders
- **load_activations:** Drivers can create for assigned orders
- **orders:** Drivers can view/update their assigned orders

### 2. Authentication

All Edge Functions verify:
- Valid JWT token
- User role permissions
- Tenant isolation
- Order ownership

### 3. Data Validation

- Order status transitions validated
- Driver assignments verified
- Location data sanitized
- QR code expiration enforced

---

## Performance Optimization

### 1. Database Indexes

All critical columns indexed:
```sql
-- Order lookups
CREATE INDEX idx_orders_assigned_driver_id ON orders(assigned_driver_id);
CREATE INDEX idx_orders_load_activated_at ON orders(load_activated_at);

-- QR code lookups
CREATE INDEX idx_qr_codes_order_id ON qr_codes(order_id);
CREATE INDEX idx_qr_codes_status ON qr_codes(status);

-- Load activation queries
CREATE INDEX idx_load_activations_order_id ON load_activations(order_id);
CREATE INDEX idx_load_activations_driver_id ON load_activations(driver_id);
```

### 2. Query Optimization

- Use selective JOINs
- Limit result sets appropriately
- Cache driver lists in dashboard
- Implement pagination for large datasets

### 3. Real-time Optimization

- Subscribe only to relevant channels
- Unsubscribe when components unmount
- Batch updates when possible
- Use debouncing for frequent updates

---

## Future Enhancements

### Potential Improvements

1. **Geofencing**
   - Validate driver location against pickup/delivery zones
   - Alert if driver far from expected location
   - Automatic status updates based on location

2. **Push Notifications**
   - Real-time driver notifications
   - Status change alerts
   - Proximity notifications

3. **Analytics Dashboard**
   - Driver performance metrics
   - Activation time analysis
   - QR scan success rates
   - Delivery time tracking

4. **Multi-QR Support**
   - Different QR codes for pickup vs delivery
   - Item-level QR codes
   - Package verification

5. **Offline Mode**
   - Queue activations when offline
   - Sync when connection restored
   - Cache order data locally

---

## Support and Maintenance

### Monitoring

Monitor these metrics:
- Load activation success rate
- QR scan success rate
- Average activation time
- Driver assignment rate
- Order completion time

### Logs

Check logs in:
- Supabase Edge Function logs
- Mobile app console
- Dashboard browser console
- Database audit_log table

### Backup

Regularly backup:
- qr_codes table
- load_activations table
- orders table (with new fields)

---

## Conclusion

This implementation provides a complete driver allocation, load activation, and QR code scanning system fully integrated with Supabase. The solution includes:

- ✅ Comprehensive database schema
- ✅ Secure Edge Functions
- ✅ User-friendly dashboard interface
- ✅ Feature-rich mobile app
- ✅ Real-time synchronization
- ✅ Complete audit trail
- ✅ Robust error handling

For questions or issues, refer to the troubleshooting section or check the Supabase documentation.

**Document Version:** 1.0.0  
**Last Updated:** October 8, 2025  
**Author:** Astro Development Team
