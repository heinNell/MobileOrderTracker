// Supabase Edge Function: Generate QR Code
// Generates signed QR codes for orders

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";
import QRCode from "https://esm.sh/qrcode@1.5.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return new Response(JSON.stringify({ error: "Order ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user permissions (admin or dispatcher)
    const { data: userData } = await supabase
      .from("users")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!userData || !["admin", "dispatcher"].includes(userData.role)) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("tenant_id", userData.tenant_id)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate QR code data
    const timestamp = Date.now();
    const secret = Deno.env.get("QR_CODE_SECRET");
    if (!secret) {
      console.error("QR_CODE_SECRET environment variable is not set");
      return new Response(
        JSON.stringify({
          error: "Server configuration error",
          details: "QR_CODE_SECRET not configured"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create signature
    const signature = createHmac("sha256", secret)
      .update(`${orderId}:${timestamp}`)
      .digest("hex");

    // Create payload
    const payload = {
      orderId,
      timestamp,
      signature,
    };

    // Encode payload
    const qrCodeData = btoa(JSON.stringify(payload));

    // Generate QR code image
    const qrCodeImage = await QRCode.toDataURL(qrCodeData, {
      errorCorrectionLevel: "H",
      type: "image/png",
      width: 512,
      margin: 2,
    });

    // Calculate expiration (24 hours from now)
    const expiresAt = new Date(timestamp + 24 * 60 * 60 * 1000).toISOString();

    // Update order with QR code data
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        qr_code_data: qrCodeData,
        qr_code_signature: signature,
        qr_code_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      throw updateError;
    }

    // Log QR code generation
    await supabase.from("audit_log").insert({
      tenant_id: userData.tenant_id,
      user_id: user.id,
      order_id: orderId,
      action: "QR_CODE_GENERATED",
      resource_type: "order",
      resource_id: orderId,
      new_values: { generated_at: new Date().toISOString() },
    });

    return new Response(
      JSON.stringify({
        success: true,
        qrCode: {
          data: qrCodeData,
          image: qrCodeImage,
          expiresAt,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating QR code:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
