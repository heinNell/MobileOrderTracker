// Test QR Code Generation
// Usage: node test-qr-generation.js

import { createClient } from "@supabase/supabase-js";

// Load environment variables
const supabaseUrl = "https://liagltqpeilbswuqcahp.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpYWdsdHFwZWlsYnN3dXFjYWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNTcxODUsImV4cCI6MjA3MzkzMzE4NX0.71jtSKXQsCb2Olxzxf6CCX9zl5Hqtgp9k--gsvCw11s";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpYWdsdHFwZWlsYnN3dXFjYWhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM1NzE4NSwiZXhwIjoyMDczOTMzMTg1fQ.dtEl-YMJZ-YmEaS9B7Loy7I3bRcf-2sHjpHRF8sCD8o";

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createTestUser() {
  console.log("👤 Creating test user...");

  const testEmail = "test@example.com";
  const testPassword = "testpass123";

  try {
    // Create user in auth
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

    if (authError && !authError.message.includes("already registered")) {
      throw authError;
    }

    const userId =
      authUser?.user?.id ||
      (await supabaseAdmin.auth.admin.listUsers()).data.users.find(
        (u) => u.email === testEmail
      )?.id;

    if (!userId) {
      throw new Error("Could not get user ID");
    }

    // Check if user exists in users table
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();

    if (!existingUser) {
      // Get the first tenant
      const { data: tenant } = await supabaseAdmin
        .from("tenants")
        .select("id")
        .limit(1)
        .single();

      if (!tenant) {
        throw new Error("No tenant found");
      }

      // Create user record
      const { error: userError } = await supabaseAdmin.from("users").insert({
        id: userId,
        email: testEmail,
        role: "admin",
        tenant_id: tenant.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (userError) {
        throw userError;
      }
    }

    console.log(`✅ Test user ready: ${testEmail}`);
    return { email: testEmail, password: testPassword };
  } catch (error) {
    console.error("❌ Error creating test user:", error.message);
    return null;
  }
}

async function testQRGeneration() {
  console.log("🧪 Testing QR Code Generation...\n");

  try {
    // Step 1: Create and authenticate test user
    const testUser = await createTestUser();
    if (!testUser) {
      console.log("❌ Could not create test user");
      return;
    }

    console.log("🔐 Authenticating test user...");
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password,
      });

    if (authError) {
      console.error("❌ Authentication failed:", authError.message);
      return;
    }

    console.log(`✅ Authenticated as: ${authData.user.email}`);

    // Step 2: Get the first available order
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, customer_name, status")
      .limit(1);

    if (ordersError) {
      console.error("❌ Error fetching orders:", ordersError);
      return;
    }

    if (!orders || orders.length === 0) {
      console.log("⚠️ No orders found in the database");
      return;
    }

    const order = orders[0];
    console.log(
      `📦 Found order: ${order.id} (${
        order.customer_name || "Unknown Customer"
      })`
    );

    // Step 3: Test QR generation with authenticated user
    console.log("🔄 Generating QR code...");
    const { data: result, error: qrError } = await supabase.functions.invoke(
      "generate-qr-code",
      {
        body: { orderId: order.id },
      }
    );

    if (qrError) {
      console.error("❌ QR Generation Error:", qrError);
      console.log("Error details:", {
        message: qrError.message,
        status: qrError.context?.status,
        statusText: qrError.context?.statusText,
      });
      return;
    }

    if (result && result.success) {
      console.log("✅ QR Code generated successfully!");
      console.log(`📅 Expires at: ${result.qrCode.expiresAt}`);
      console.log(`📊 Data length: ${result.qrCode.data.length} characters`);
      console.log(
        `🖼️ Image format: ${result.qrCode.image.substring(0, 30)}...`
      );
      console.log("💾 QR code image data ready (base64 format)");
    } else {
      console.log("❌ QR Code generation failed");
      console.log("Response:", result);
    }

    // Step 4: Sign out
    await supabase.auth.signOut();
    console.log("🚪 Signed out successfully");
  } catch (error) {
    console.error("💥 Test failed with error:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

// Run the test
testQRGeneration();
