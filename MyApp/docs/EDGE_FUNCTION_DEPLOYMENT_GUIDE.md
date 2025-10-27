## 🚀 Deploy CORS-Fixed Edge Function

### **CRITICAL:** Your mobile app is working, but the Edge Function needs CORS headers!

## Error You're Seeing:

```
Access to fetch at 'https://liagltqpeilbswuqcahp.supabase.co/functions/v1/activate-load'
from origin 'https://improved-space-disco-xrw4wpvvp56f64xp-8081.app.github.dev'
has been blocked by CORS policy
```

## Solution: Deploy the CORS-Fixed Edge Function

### **Option 1: Quick Copy-Paste (Recommended)**

1. **Go to your Supabase Dashboard**

   - Navigate to: Edge Functions
   - Find or create the `activate-load` function

2. **Replace the function code**
   - Copy the entire contents of `supabase-edge-function-cors-fix.ts`
   - Paste it as your `activate-load` Edge Function code
   - Deploy the function

### **Option 2: Using Supabase CLI**

If you have Supabase CLI installed:

```bash
# Navigate to your project
cd /path/to/your/supabase/project

# Create the function directory
mkdir -p supabase/functions/activate-load

# Copy our CORS-fixed function
cp /workspaces/MobileOrderTracker/MyApp/supabase-edge-function-cors-fix.ts supabase/functions/activate-load/index.ts

# Deploy the function
supabase functions deploy activate-load
```

### **Option 3: Manual Creation**

Create a new file at: `supabase/functions/activate-load/index.ts`

Copy and paste this code:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { order_id, driver_id, latitude, longitude, timestamp, app_version } =
      await req.json();

    // Activate the order with location data
    const { data, error } = await supabaseClient
      .from("orders")
      .update({
        status: "active",
        activated_at: timestamp,
        driver_location_lat: latitude,
        driver_location_lng: longitude,
      })
      .eq("id", order_id)
      .eq("assigned_driver_id", driver_id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 400,
      }
    );
  }
});
```

## **After Deployment:**

### Test the fix:

1. **Deploy the CORS-fixed Edge Function**
2. **Test your mobile app** - Order activation should work
3. **Check browser console** - CORS errors should be gone

## **Key Changes Made:**

- ✅ **CORS Headers Added** - Allows cross-origin requests
- ✅ **OPTIONS Handler** - Handles preflight requests
- ✅ **Proper Error Handling** - Returns JSON with CORS headers
- ✅ **Uses assigned_driver_id** - Matches your database schema

## **Verification:**

After deployment, your mobile app should successfully:

- Activate orders without CORS errors
- Update order status to 'active'
- Save GPS location data
- Navigate properly after activation

The database is now ready (great job on running the migration!), and this Edge Function fix will complete the solution!
