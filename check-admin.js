import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://liagltqpeilbswuqcahp.supabase.co";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpYWdsdHFwZWlsYnN3dXFjYWhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM1NzE4NSwiZXhwIjoyMDczOTMzMTg1fQ.dtEl-YMJZ-YmEaS9B7Loy7I3bRcf-2sHjpHRF8sCD8o";

async function checkAdminUser() {
  console.log("🔍 Checking admin user details...\n");

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // Get admin user details
  const { data: adminUser, error: adminError } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("email", "heinrich@matanuska.co.za")
    .single();

  if (adminError) {
    console.error("❌ Error fetching admin user:", adminError);
    return;
  }

  console.log("👨‍💼 Admin user details:", adminUser);

  // Check the users table structure
  console.log("\n🏗️ Checking users table structure...");

  // Get table info
  const { data: tableInfo, error: tableError } = await supabaseAdmin
    .from("information_schema.columns")
    .select("column_name, data_type, is_nullable, column_default")
    .eq("table_name", "users")
    .eq("table_schema", "public");

  if (tableError) {
    console.error("❌ Error fetching table info:", tableError);
  } else {
    console.log("📊 Users table columns:", tableInfo);
  }

  return adminUser;
}

checkAdminUser().catch(console.error);
