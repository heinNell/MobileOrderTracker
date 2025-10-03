// Test script to verify PostGIS Geography format returned by Supabase
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Read .env file manually
const envContent = readFileSync(".env", "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const [key, ...values] = line.split("=");
  if (key && values.length) {
    env[key.trim()] = values.join("=").trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing Supabase credentials");
  console.log("URL:", supabaseUrl);
  console.log("Key:", supabaseAnonKey ? "✓ Found" : "✗ Missing");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLocationFormat() {
  console.log("🔍 Testing PostGIS Geography format...\n");

  // Fetch an order with location data
  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, loading_point_location, unloading_point_location"
    )
    .limit(1);

  if (error) {
    console.error("❌ Error fetching orders:", error);
    return;
  }

  if (!orders || orders.length === 0) {
    console.log("⚠️  No orders found in database");
    return;
  }

  const order = orders[0];

  console.log("📦 Order:", order.order_number);
  console.log("📍 Loading Point Location:");
  console.log("   Type:", typeof order.loading_point_location);
  console.log("   Value:", order.loading_point_location);
  console.log(
    "   JSON:",
    JSON.stringify(order.loading_point_location, null, 2)
  );

  console.log("\n📍 Unloading Point Location:");
  console.log("   Type:", typeof order.unloading_point_location);
  console.log("   Value:", order.unloading_point_location);
  console.log(
    "   JSON:",
    JSON.stringify(order.unloading_point_location, null, 2)
  );

  // Try to access as object
  console.log("\n🧪 Testing object access:");
  try {
    const loading = order.loading_point_location as any;
    console.log("   loading.latitude:", loading?.latitude);
    console.log("   loading.longitude:", loading?.longitude);
    console.log("   loading.coordinates:", loading?.coordinates);
    console.log("   loading.type:", loading?.type);
  } catch (e) {
    console.error("   ❌ Error accessing location:", e);
  }

  // Try with PostGIS functions
  console.log("\n🔧 Testing with PostGIS functions:");
  const { data: geoData, error: geoError } = await supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      loading_point_location,
      unloading_point_location
    `
    )
    .eq("id", order.id)
    .limit(1)
    .single();

  if (geoError) {
    console.error("❌ Error:", geoError);
  } else {
    console.log("   Raw result:", geoData);
  }
}

testLocationFormat()
  .then(() => {
    console.log("\n✅ Test complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Test failed:", err);
    process.exit(1);
  });
