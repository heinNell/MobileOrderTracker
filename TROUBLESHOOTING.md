# Order Retrieval and QR Code Generation - Troubleshooting Guide

## Quick Fix Summary

### 🔴 **Immediate Actions Required**

1. **Run the diagnostic script** to identify specific issues
2. **Apply the database fixes** to ensure proper data structure  
3. **Restart the development server** to pick up environment changes

### 🟡 **Common Issues and Solutions**

## Issue 1: "Order Cannot Be Found" Error

### Root Causes:
1. **User-Tenant Linkage Missing**
2. **Row Level Security (RLS) Policies Blocking Access**
3. **Missing or Corrupted User Profile**
4. **Orders Created Without Proper Tenant Association**

### Diagnostic Steps:

1. **Run the diagnostic SQL script:**
```bash
# In your database (Supabase SQL Editor)
-- Run: /workspaces/MobileOrderTracker/diagnostic-script.sql
```

2. **Check user authentication status:**
```bash
# In the browser console on orders page
console.log(await supabase.auth.getSession())
```

3. **Verify user exists in users table:**
```sql
SELECT * FROM public.users WHERE id = auth.uid();
```

### Solutions:

#### Solution 1: Fix User-Tenant Linkage
```sql
-- Run: /workspaces/MobileOrderTracker/fix-order-issues.sql
-- This will create default tenant and link users
```

#### Solution 2: Manual User Setup
```sql
-- If user doesn't exist in users table
INSERT INTO public.users (
    id, email, full_name, role, tenant_id, is_active
) VALUES (
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    'Your Name',
    'admin',
    (SELECT id FROM public.tenants WHERE subdomain = 'default' LIMIT 1),
    true
) ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    role = EXCLUDED.role,
    is_active = true;
```

#### Solution 3: Create Default Tenant
```sql
INSERT INTO public.tenants (name, subdomain, is_active)
VALUES ('Default Organization', 'default', true)
ON CONFLICT (subdomain) DO NOTHING;
```

## Issue 2: QR Code Generation Server Error

### Root Causes:
1. **Missing QR_CODE_SECRET Environment Variable**
2. **Edge Function Not Deployed**
3. **Authentication Issues**
4. **Permission Problems**

### Diagnostic Steps:

1. **Check environment variables:**
```bash
echo $QR_CODE_SECRET
# Should output a base64 encoded string
```

2. **Test QR function directly:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/generate-qr-code \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "test-order-id"}'
```

### Solutions:

#### Solution 1: Add Missing Environment Variable
```bash
# Add to .env and .env.local files
QR_CODE_SECRET=nWSdlURQjs0EyU4xKHsLjT8zRjpVMaslx84r1ensgyE=
```

#### Solution 2: Deploy Edge Functions
```bash
cd /workspaces/MobileOrderTracker
supabase functions deploy generate-qr-code
supabase functions deploy validate-qr-code
```

#### Solution 3: Update Function Environment Variables
```bash
# Set secrets for edge functions
supabase secrets set QR_CODE_SECRET=nWSdlURQjs0EyU4xKHsLjT8zRjpVMaslx84r1ensgyE=
```

## Issue 3: Front-End/Back-End Discrepancies

### Common Problems:
1. **Environment variable mismatches**
2. **Stale authentication tokens**
3. **Browser cache issues**

### Solutions:

#### Solution 1: Clear Browser Cache
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

#### Solution 2: Verify Environment Variables
```bash
# Check dashboard environment
cat /workspaces/MobileOrderTracker/dashboard/.env.local | grep SUPABASE

# Should match main environment
cat /workspaces/MobileOrderTracker/.env | grep SUPABASE
```

#### Solution 3: Restart Development Server
```bash
cd /workspaces/MobileOrderTracker/dashboard
npm run dev
```

## Comprehensive Testing Steps

### 1. Database Connection Test
```sql
-- Run in Supabase SQL Editor
SELECT 
    'Database Connection' as test,
    NOW() as timestamp,
    current_user,
    current_database();
```

### 2. User Authentication Test
```javascript
// Run in browser console on orders page
const testAuth = async () => {
    const { data: session } = await supabase.auth.getSession();
    console.log('Session:', session);
    
    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.session.user.id)
        .single();
    console.log('User data:', user);
};
testAuth();
```

### 3. Order Visibility Test
```sql
-- Run in Supabase SQL Editor
SELECT 
    COUNT(*) as total_orders,
    COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as orders_with_tenant,
    COUNT(CASE WHEN created_by IS NOT NULL THEN 1 END) as orders_with_creator
FROM public.orders;
```

### 4. QR Code Function Test
```javascript
// Run in browser console
const testQR = async () => {
    try {
        const { data: orders } = await supabase
            .from('orders')
            .select('id')
            .limit(1);
        
        if (orders.length > 0) {
            const qrResult = await generateQRCode(orders[0].id);
            console.log('QR generation successful:', qrResult);
        }
    } catch (error) {
        console.error('QR generation failed:', error);
    }
};
testQR();
```

## Automated Diagnostic Tool

Run the comprehensive diagnostic tool:

```bash
cd /workspaces/MobileOrderTracker
node diagnostic-tool.js

# To automatically apply fixes:
node diagnostic-tool.js --fix
```

## Prevention Measures

### 1. Environment Variable Management
- Keep `.env` and `.env.local` synchronized
- Use a shared environment configuration system
- Document all required environment variables

### 2. Database Integrity
- Regular backup of important data
- Monitor RLS policy effectiveness
- Implement proper error logging

### 3. User Management
- Ensure all authenticated users have corresponding profiles
- Implement automatic user setup on first login
- Regular audit of user-tenant associations

### 4. QR Code System
- Monitor edge function deployment status
- Test QR generation in development before production
- Implement fallback QR generation methods

## Emergency Recovery

If all else fails, run this emergency reset:

```sql
-- WARNING: This will reset your system to a clean state
-- Backup your data first!

-- Reset user linkage
UPDATE public.users 
SET tenant_id = (SELECT id FROM public.tenants WHERE subdomain = 'default' LIMIT 1)
WHERE tenant_id IS NULL;

-- Fix orphaned orders
UPDATE public.orders 
SET tenant_id = (SELECT id FROM public.tenants WHERE subdomain = 'default' LIMIT 1)
WHERE tenant_id IS NULL;

-- Reset QR codes to regenerate
UPDATE public.orders 
SET qr_code_signature = 'pending'
WHERE qr_code_signature IS NULL OR qr_code_signature = '';
```

## Getting Help

1. **Check the enhanced orders page** (`enhanced-orders-page.tsx`) for better error reporting
2. **Use the debug modal** in the orders interface to see real-time diagnostics
3. **Run the diagnostic tool** regularly to catch issues early
4. **Check server logs** for edge function errors
5. **Verify database RLS policies** are correctly configured

## Success Indicators

✅ Users can see orders in their tenant
✅ QR codes generate and download successfully  
✅ No console errors in browser
✅ Debug information shows healthy system status
✅ Orders can be created and retrieved consistently