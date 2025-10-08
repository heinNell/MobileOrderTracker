const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function base64EncodeUtf8(str) {
  const enc = new TextEncoder().encode(str);
  let binary = "";
  const bytes = new Uint8Array(enc);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function hmacSha256Hex(key, message) {
  const enc = new TextEncoder();
  const keyData = enc.encode(key);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Use QRCode generation via esm.sh to avoid npm resolution issues
import QRCode from "https://esm.sh/qrcode@1.5.3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => null);
    const orderId = body?.orderId;
    if (!orderId) return new Response(JSON.stringify({ error: "Order ID is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const qrSecret = Deno.env.get("QR_CODE_SECRET");
    const auditTable = Deno.env.get("AUDIT_TABLE") || "audit_log"; // table name only

    if (!supabaseUrl || !serviceRole || !qrSecret) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Authorization required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const token = authHeader.replace(/Bearer\s+/i, "");

    // Verify user via auth endpoint
    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}` } });
    if (!userResp.ok) return new Response(JSON.stringify({ error: "Invalid authorization" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userData = await userResp.json();

    // Fetch user row from users table via REST
    const fetchUser = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userData.id}&select=tenant_id,role`, {
      headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}` },
    });
    const users = await fetchUser.json();
    const dbUser = Array.isArray(users) && users[0];
    if (!dbUser) return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!["admin", "dispatcher"].includes(dbUser.role)) return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Fetch order
    const fetchOrder = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}&tenant_id=eq.${dbUser.tenant_id}`, {
      headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}` },
    });
    const orders = await fetchOrder.json();
    const order = Array.isArray(orders) && orders[0];
    if (!order) return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const timestamp = Date.now();
    const signature = await hmacSha256Hex(qrSecret, `${orderId}:${timestamp}`);
    const payload = { orderId, timestamp, signature };
    const qrCodeData = base64EncodeUtf8(JSON.stringify(payload));

    const qrCodeImage = await QRCode.toDataURL(qrCodeData, { errorCorrectionLevel: "H", type: "image/png", width: 512, margin: 2 });

    const expiresAt = new Date(timestamp + 24 * 60 * 60 * 1000).toISOString();

    // Update order via REST (PATCH)
    await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}`, {
      method: "PATCH",
      headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}`, "Content-Type": "application/json" },
      body: JSON.stringify({ qr_code_data: qrCodeData, qr_code_signature: signature, qr_code_expires_at: expiresAt }),
    });

    // Insert audit row
    try {
      await fetch(`${supabaseUrl}/rest/v1/${auditTable}`, {
        method: "POST",
        headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}`, "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: dbUser.tenant_id, user_id: userData.id, order_id: orderId, action: "QR_CODE_GENERATED", resource_type: "order", resource_id: orderId, new_values: { generated_at: new Date().toISOString() } }),
      });
    } catch (e) {
      console.error("Audit insert failed", e);
    }

    return new Response(JSON.stringify({ success: true, qrCode: { data: qrCodeData, image: qrCodeImage, expiresAt } }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Error generating QR code:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: "Internal server error", details: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});