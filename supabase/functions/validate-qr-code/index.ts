// Supabase Edge Function: Validate QR Code
// Validates QR code signatures and returns order details

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface QRCodePayload {
  orderId: string;
  timestamp: number;
  signature: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the QR code data from request
    const { qrCodeData } = await req.json();

    if (!qrCodeData) {
      return new Response(
        JSON.stringify({ error: "QR code data is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse QR code data
    const payload: QRCodePayload = JSON.parse(atob(qrCodeData));
    const { orderId, timestamp, signature } = payload;

    // Check if QR code has expired (24 hours validity)
    const now = Date.now();
    const expirationTime = 24 * 60 * 60 * 1000; // 24 hours
    if (now - timestamp > expirationTime) {
      return new Response(JSON.stringify({ error: "QR code has expired" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify signature
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

    const expectedSignature = createHmac("sha256", secret)
      .update(`${orderId}:${timestamp}`)
      .digest("hex");

    if (signature !== expectedSignature) {
      return new Response(
        JSON.stringify({ error: "Invalid QR code signature" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get JWT token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
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

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        `
        *,
        assigned_driver:users!orders_assigned_driver_id_fkey(id, full_name, phone),
        tenant:tenants(id, name)
      `
      )
      .eq("id", orderId)
      .eq("qr_code_data", qrCodeData)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found or QR code mismatch" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user has access to this order
    const { data: userData } = await supabase
      .from("users")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!userData || userData.tenant_id !== order.tenant_id) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log QR code scan
    await supabase.from("audit_log").insert({
      tenant_id: order.tenant_id,
      user_id: user.id,
      order_id: orderId,
      action: "QR_CODE_SCANNED",
      resource_type: "order",
      resource_id: orderId,
      new_values: { scanned_at: new Date().toISOString() },
    });

    // Check if load is activated for drivers
    if (userData.role === "driver") {
      // If order is pending, auto-assign
      if (order.status === "pending") {
        await supabase
          .from("orders")
          .update({
            assigned_driver_id: user.id,
            status: "assigned",
            actual_start_time: new Date().toISOString(),
          })
          .eq("id", orderId);

        // Create status update
        await supabase.from("status_updates").insert({
          order_id: orderId,
          driver_id: user.id,
          status: "assigned",
          notes: "Order assigned via QR code scan",
        });

        order.assigned_driver_id = user.id;
        order.status = "assigned";
      }

      // Check if driver is assigned to this order
      if (order.assigned_driver_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "You are not assigned to this order" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check if load is activated (required for drivers)
      if (order.status === "assigned" && !order.load_activated_at) {
        return new Response(
          JSON.stringify({ 
            error: "Load must be activated before scanning",
            details: "Please activate the load first using the mobile app"
          }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Auto-progress to in_progress if scanning activated order for first time
      if (order.status === "activated") {
        await supabase
          .from("orders")
          .update({
            status: "in_progress",
            actual_start_time: new Date().toISOString(),
          })
          .eq("id", orderId);

        // Create status update
        await supabase.from("status_updates").insert({
          order_id: orderId,
          driver_id: user.id,
          status: "in_progress",
          notes: "Order started via QR code scan",
        });

        order.status = "in_progress";
      }
    }

    // Return order details
    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.order_number,
          status: order.status,
          sku: order.sku,
          loadingPoint: {
            name: order.loading_point_name,
            address: order.loading_point_address,
            location: order.loading_point_location,
            timeWindow: {
              start: order.loading_time_window_start,
              end: order.loading_time_window_end,
            },
          },
          unloadingPoint: {
            name: order.unloading_point_name,
            address: order.unloading_point_address,
            location: order.unloading_point_location,
            timeWindow: {
              start: order.unloading_time_window_start,
              end: order.unloading_time_window_end,
            },
          },
          waypoints: order.waypoints,
          deliveryInstructions: order.delivery_instructions,
          specialHandling: order.special_handling_instructions,
          contact: {
            name: order.contact_name,
            phone: order.contact_phone,
          },
          estimatedDistance: order.estimated_distance_km,
          estimatedDuration: order.estimated_duration_minutes,
          assignedDriver: order.assigned_driver,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error validating QR code:", error);
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
