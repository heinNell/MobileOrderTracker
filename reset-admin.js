import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://liagltqpeilbswuqcahp.supabase.co";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpYWdsdHFwZWlsYnN3dXFjYWhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM1NzE4NSwiZXhwIjoyMDczOTMzMTg1fQ.dtEl-YMJZ-YmEaS9B7Loy7I3bRcf-2sHjpHRF8sCD8o";

async function resetAdminPassword() {
  console.log("🔐 Resetting admin password...\n");

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // Get the existing admin user
  const { data: users, error: usersError } = await supabaseAdmin
    .from("users")
    .select("id, email")
    .eq("email", "heinrich@matanuska.co.za")
    .single();

  if (usersError) {
    console.error("❌ Error fetching admin user:", usersError);
    return;
  }

  console.log("👤 Found admin user:", users);

  // Reset password
  const newPassword = "admin123456";
  const { data: updateResult, error: updateError } =
    await supabaseAdmin.auth.admin.updateUserById(users.id, {
      password: newPassword,
    });

  if (updateError) {
    console.error("❌ Error updating password:", updateError);
    return;
  }

  console.log("✅ Password updated successfully");
  console.log("📧 Email:", users.email);
  console.log("🔑 New password:", newPassword);

  return { email: users.email, password: newPassword };
}

// Run the password reset
resetAdminPassword().catch(console.error);
