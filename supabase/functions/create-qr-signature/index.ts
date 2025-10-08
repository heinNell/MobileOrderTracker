// supabase/functions/create-qr-signature/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Helper function to create HMAC signature
async function createHMACSignature(
  payload: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const data = encoder.encode(payload);
  const signature = await crypto.subtle.sign("HMAC", key, data);

  // Convert to base64url format
  const signatureBase64 = btoa(
    String.fromCharCode(...new Uint8Array(signature))
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return signatureBase64;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { orderId, timestamp, tenantId } = await req.json();

    if (!orderId || !timestamp) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: orderId and timestamp",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Get secret key from environment
    const secret = Deno.env.get("QR_CODE_SECRET_KEY");
    if (!secret) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Server configuration error",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Create payload for signing
    const payload = JSON.stringify({ orderId, timestamp, tenantId });

    // Generate signature
    const signature = await createHMACSignature(payload, secret);

    return new Response(
      JSON.stringify({
        success: true,
        signature: signature,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Signature creation error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to create signature",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
