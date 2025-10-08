import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://liagltqpeilbswuqcahp.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpYWdsdHFwZWlsYnN3dXFjYWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNTcxODUsImV4cCI6MjA3MzkzMzE4NX0.71jtSKXQsCb2Olxzxf6CCX9zl5Hqtgp9k--gsvCw11s";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpYWdsdHFwZWlsYnN3dXFjYWhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM1NzE4NSwiZXhwIjoyMDczOTMzMTg1fQ.dtEl-YMJZ-YmEaS9B7Loy7I3bRcf-2sHjpHRF8sCD8o";

async function testEdgeFunction() {
  console.log("🔍 Testing Edge Function...\n");

  // Create admin client to check users
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  console.log("1. Checking existing users...");
  const { data: users, error: usersError } = await supabaseAdmin
    .from("users")
    .select("id, email, full_name, role, is_active")
    .limit(5);

  if (usersError) {
    console.error("❌ Error fetching users:", usersError);
    return;
  }

  console.log("👥 Users in database:", users);

  // Check for admin users
  const adminUsers = users.filter((u) =>
    ["admin", "dispatcher"].includes(u.role)
  );
  console.log("👨‍💼 Admin/Dispatcher users:", adminUsers);

  if (adminUsers.length === 0) {
    console.log("⚠️  No admin/dispatcher users found. Creating one...");

    // Create an admin user for testing
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: "admin@test.com",
        password: "admin123456",
        email_confirm: true,
        user_metadata: {
          full_name: "Test Admin",
          role: "admin",
        },
      });

    if (authError) {
      console.error("❌ Error creating auth user:", authError);
      return;
    }

    // Create user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .insert({
        id: authUser.user.id,
        email: "admin@test.com",
        full_name: "Test Admin",
        role: "admin",
        tenant_id: "test-tenant",
        is_active: true,
      })
      .select()
      .single();

    if (profileError) {
      console.error("❌ Error creating user profile:", profileError);
      return;
    }

    console.log("✅ Created admin user:", profile);
  }

  // Now test the Edge Function
  console.log("\n2. Testing Edge Function...");

  // First, get a proper session
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Sign in as admin
  const { data: session, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: "heinrich@matanuska.co.za",
      password: "admin123456",
    });

  if (signInError) {
    console.error("❌ Error signing in:", signInError);
    return;
  }

  console.log("✅ Signed in successfully");

  // Test the Edge Function
  const testDriverData = {
    email: "testdriver@example.com",
    full_name: "Test Driver",
    phone: "+1234567890",
    password: "driver123456",
  };

  console.log("📞 Calling Edge Function with data:", testDriverData);

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/create-driver-account`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testDriverData),
      }
    );

    const responseText = await response.text();
    console.log("📋 Raw response:", responseText);

    if (!response.ok) {
      console.error("❌ Function returned error status:", response.status);
      try {
        const errorData = JSON.parse(responseText);
        console.error("📄 Error details:", errorData);
      } catch (e) {
        console.error("📄 Raw error text:", responseText);
      }
      return;
    }

    const functionResult = JSON.parse(responseText);
    console.log("✅ Edge Function result:", functionResult);
  } catch (error) {
    console.error("❌ Network or parsing error:", error);
  }
}

// Run the test
testEdgeFunction().catch(console.error);
