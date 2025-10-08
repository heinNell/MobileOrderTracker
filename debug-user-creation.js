import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://liagltqpeilbswuqcahp.supabase.co";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpYWdsdHFwZWlsYnN3dXFjYWhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM1NzE4NSwiZXhwIjoyMDczOTMzMTg1fQ.dtEl-YMJZ-YmEaS9B7Loy7I3bRcf-2sHjpHRF8sCD8o";

async function debugUserCreation() {
  console.log("🔍 Debugging user creation...\n");

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // Check if user already exists
  console.log("1. Checking if user already exists...");
  const { data: existingUsers, error: checkError } = await supabaseAdmin
    .from("users")
    .select("id, email")
    .eq("email", "testdriver@example.com");

  if (checkError) {
    console.error("❌ Error checking existing users:", checkError);
  } else {
    console.log("👥 Existing users with this email:", existingUsers);
  }

  // Check auth users
  console.log("\n2. Checking auth users...");
  try {
    const { data: authUsers, error: authError } =
      await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.error("❌ Error listing auth users:", authError);
    } else {
      const testUser = authUsers.users.find(
        (u) => u.email === "testdriver@example.com"
      );
      console.log("🔐 Test user in auth:", testUser ? "EXISTS" : "NOT FOUND");
    }
  } catch (error) {
    console.error("❌ Error accessing auth admin:", error);
  }

  // Try creating user with admin client directly
  console.log("\n3. Testing direct user creation...");

  const testEmail = `testdriver-${Date.now()}@example.com`;
  console.log("📧 Using unique email:", testEmail);

  try {
    const { data: authUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: "testpassword123",
        email_confirm: true,
        user_metadata: {
          full_name: "Test Driver Direct",
          role: "driver",
        },
      });

    if (createError) {
      console.error("❌ Direct auth user creation failed:", createError);
    } else {
      console.log("✅ Direct auth user created:", authUser.user.id);

      // Try creating profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("users")
        .insert({
          id: authUser.user.id,
          email: testEmail,
          full_name: "Test Driver Direct",
          role: "driver",
          tenant_id: "test-tenant",
          is_active: true,
        })
        .select()
        .single();

      if (profileError) {
        console.error("❌ Profile creation failed:", profileError);
      } else {
        console.log("✅ Profile created:", profile);
      }
    }
  } catch (error) {
    console.error("❌ Exception during user creation:", error);
  }
}

debugUserCreation().catch(console.error);
