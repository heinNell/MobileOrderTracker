// Check Users in System
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://liagltqpeilbswuqcahp.supabase.co";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpYWdsdHFwZWlsYnN3dXFjYWhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM1NzE4NSwiZXhwIjoyMDczOTMzMTg1fQ.dtEl-YMJZ-YmEaS9B7Loy7I3bRcf-2sHjpHRF8sCD8o";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function checkUsers() {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("id, email, role, tenant_id")
      .limit(5);

    if (error) {
      console.error("Error:", error);
      return;
    }

    console.log("📋 Users in system:");
    users.forEach((user) => {
      console.log(
        `  - ${user.email} (${user.role}) - Tenant: ${user.tenant_id}`
      );
    });

    // Also check auth.users
    const { data: authUsers, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) {
      console.error("Auth Error:", authError);
      return;
    }

    console.log("\n🔐 Auth users:");
    authUsers.users.forEach((user) => {
      console.log(`  - ${user.email} (ID: ${user.id})`);
    });
  } catch (error) {
    console.error("💥 Error:", error.message);
  }
}

checkUsers();
