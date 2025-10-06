// Simple QR Code Test using Service Role Key
// Usage: node simple-qr-test.js

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://liagltqpeilbswuqcahp.supabase.co";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpYWdsdHFwZWlsYnN3dXFjYWhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM1NzE4NSwiZXhwIjoyMDczOTMzMTg1fQ.dtEl-YMJZ-YmEaS9B7Loy7I3bRcf-2sHjpHRF8sCD8o";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function testQRDirectly() {
  console.log("🧪 Testing QR Code Generation (Direct API Call)...\n");

  try {
    // Step 1: Get an existing user and order
    const { data: users } = await supabase
      .from("users")
      .select("id, email, tenant_id, role")
      .eq("role", "admin")
      .limit(1);

    if (!users || users.length === 0) {
      console.log("❌ No admin users found");
      return;
    }

    const user = users[0];
    console.log(`👤 Using user: ${user.email} (${user.role})`);

    // Step 2: Get an order for this tenant
    const { data: orders } = await supabase
      .from("orders")
      .select("id, customer_name, status, tenant_id")
      .eq("tenant_id", user.tenant_id)
      .limit(1);

    if (!orders || orders.length === 0) {
      console.log("❌ No orders found for this tenant");
      return;
    }

    const order = orders[0];
    console.log(
      `📦 Found order: ${order.id} (${
        order.customer_name || "Unknown Customer"
      })`
    );

    // Step 3: Generate JWT token for this user
    const { data: tokenData, error: tokenError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: user.email,
      });

    if (tokenError) {
      console.error("❌ Token generation failed:", tokenError.message);
      return;
    }

    console.log("🔑 Generated authentication token");

    // Step 4: Test the QR generation endpoint directly
    console.log("🔄 Testing QR generation endpoint...");

    const response = await fetch(
      `${supabaseUrl}/functions/v1/generate-qr-code`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
          apikey: supabaseServiceKey,
        },
        body: JSON.stringify({
          orderId: order.id,
          userId: user.id, // Pass user ID directly for service role calls
        }),
      }
    );

    const responseText = await response.text();
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📋 Response body: ${responseText}`);

    if (response.ok) {
      const result = JSON.parse(responseText);
      if (result.success) {
        console.log("✅ QR Code generated successfully!");
        console.log(`📅 Expires at: ${result.qrCode.expiresAt}`);
        console.log(`📊 Data length: ${result.qrCode.data.length} characters`);
        console.log(
          `🖼️ Image format: ${result.qrCode.image.substring(0, 30)}...`
        );
      } else {
        console.log("❌ QR generation failed:", result);
      }
    } else {
      console.log("❌ HTTP Error:", response.status, responseText);
    }
  } catch (error) {
    console.error("💥 Test failed:", error.message);
  }
}

testQRDirectly();
