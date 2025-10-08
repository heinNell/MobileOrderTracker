// Quick test of the driver creation Edge Function after applying the fix
const SUPABASE_URL = "https://liagltqpeilbswuqcahp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpYWdsdHFwZWlsYnN3dXFjYWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNTcxODUsImV4cCI6MjA3MzkzMzE4NX0.71jtSKXQsCb2Olxzxf6CCX9zl5Hqtgp9k--gsvCw11s";

async function testDriverCreation() {
  console.log("🧪 Testing Driver Creation After Database Fix...\n");

  try {
    // Step 1: Login as admin
    console.log("1️⃣ Authenticating as admin...");

    const loginResponse = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: "heinrich@matanuska.co.za",
          password: "Heinrich2024!",
        }),
      }
    );

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const authData = await loginResponse.json();
    console.log("✅ Authenticated successfully");

    // Step 2: Get user tenant
    console.log("\n2️⃣ Getting user tenant information...");

    const userResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${authData.user.id}&select=tenant_id,role`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${authData.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const userData = await userResponse.json();
    if (!userData[0]) {
      throw new Error("User data not found");
    }

    console.log("✅ User tenant:", userData[0].tenant_id);

    // Step 3: Test driver creation
    console.log("\n3️⃣ Testing driver creation via Edge Function...");

    const testDriverData = {
      email: "testfix@example.com",
      full_name: "Test Fix Driver",
      phone: "+27123456789",
      tenant_id: userData[0].tenant_id,
    };

    const driverResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/create-driver-account`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authData.access_token}`,
        },
        body: JSON.stringify(testDriverData),
      }
    );

    const driverResult = await driverResponse.json();

    if (driverResponse.ok && driverResult.success) {
      console.log("🎉 DRIVER CREATION SUCCESSFUL!");
      console.log("📄 Response:", JSON.stringify(driverResult, null, 2));

      // Clean up - delete test driver
      console.log("\n🧹 Cleaning up test driver...");
      const deleteResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/users?email=eq.${testDriverData.email}`,
        {
          method: "DELETE",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${authData.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (deleteResponse.ok) {
        console.log("✅ Test driver cleaned up");
      } else {
        console.log("⚠️ Manual cleanup needed for:", testDriverData.email);
      }
    } else {
      console.log("❌ DRIVER CREATION FAILED");
      console.log("📄 Status:", driverResponse.status);
      console.log("📄 Error:", JSON.stringify(driverResult, null, 2));
    }
  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
  }

  console.log("\n✅ Test completed");
}

// Run the test
testDriverCreation();
