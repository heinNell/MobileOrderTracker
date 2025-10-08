// /workspaces/MobileOrderTracker/supabase/functions/order_creation/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.0";
import QRCode from "https://esm.sh/qrcode@1.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}

interface OrderData {
  customer_id?: string;
  total_amount?: number;
  status?: string;
  [key: string]: any;
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { orderData }: { orderData: OrderData } = await req.json();

    if (!orderData) {
      return new Response(JSON.stringify({ error: "Missing order data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const STORAGE_BUCKET = "qr-codes";

    console.log("Creating order with atomized QR code generation...");

    // Step 1: Create the order
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        ...orderData,
        qr_code_expires_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ).toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    console.log(`✅ Order created with ID: ${order.id}`);

    // Step 2: Generate QR code data
    const qrData = {
      order_id: order.id,
      payment_url: `https://yourapp.com/pay/${order.id}`,
      tracking_code: `ORD-${order.id.slice(-8).toUpperCase()}`,
      created_at: new Date().toISOString(),
    };

    const qrCodeDataString = JSON.stringify(qrData);

    // Step 3: Create QR code record
    const { data: qrCodeRecord, error: qrError } = await supabaseClient
      .from("qr_codes")
      .insert({
        order_id: order.id,
        qr_code_data: qrCodeDataString,
        qr_code_image_url: null, // Will be updated after upload
      })
      .select()
      .single();

    if (qrError) {
      // Rollback: Delete the order
      await supabaseClient.from("orders").delete().eq("id", order.id);
      throw new Error(`Failed to create QR code record: ${qrError.message}`);
    }

    console.log(`✅ QR code record created with ID: ${qrCodeRecord.id}`);

    // Step 4: Generate QR code image using the npm qrcode library
    let qrImageBuffer: Uint8Array;

    try {
      // Convert the callback-based QRCode.toBuffer to Promise
      const buffer = await new Promise<Buffer>((resolve, reject) => {
        QRCode.toBuffer(
          qrCodeDataString,
          {
            errorCorrectionLevel: "M",
            type: "png",
            margin: 2,
            scale: 8,
            width: 512,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          },
          (err: Error | null, buffer: Buffer) => {
            if (err) reject(err);
            else resolve(buffer);
          }
        );
      });

      // Convert Buffer to Uint8Array for Deno compatibility
      qrImageBuffer = new Uint8Array(buffer);
    } catch (qrGenError) {
      // Rollback: Delete both order and QR code record
      await supabaseClient.from("qr_codes").delete().eq("id", qrCodeRecord.id);
      await supabaseClient.from("orders").delete().eq("id", order.id);
      throw new Error(
        `Failed to generate QR code image: ${qrGenError.message}`
      );
    }

    console.log("✅ QR code image generated");

    // Step 5: Upload QR code image to storage
    const filename = `qr_order_${order.id}_${Date.now()}.png`;

    const { data: uploadData, error: uploadError } =
      await supabaseClient.storage
        .from(STORAGE_BUCKET)
        .upload(filename, qrImageBuffer, {
          contentType: "image/png",
          upsert: true,
        });

    if (uploadError) {
      // Rollback: Delete both order and QR code record
      await supabaseClient.from("qr_codes").delete().eq("id", qrCodeRecord.id);
      await supabaseClient.from("orders").delete().eq("id", order.id);
      throw new Error(`Failed to upload QR code image: ${uploadError.message}`);
    }

    console.log(`✅ QR code image uploaded: ${filename}`);

    // Step 6: Get public URL for the uploaded image
    const { data: publicUrlData } = supabaseClient.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filename);

    const publicUrl = publicUrlData.publicUrl;

    // Step 7: Update QR code record with image URL
    const { data: updatedQRCode, error: updateError } = await supabaseClient
      .from("qr_codes")
      .update({ qr_code_image_url: publicUrl })
      .eq("id", qrCodeRecord.id)
      .select()
      .single();

    if (updateError) {
      // Rollback: Delete uploaded file, QR code record, and order
      await supabaseClient.storage.from(STORAGE_BUCKET).remove([filename]);
      await supabaseClient.from("qr_codes").delete().eq("id", qrCodeRecord.id);
      await supabaseClient.from("orders").delete().eq("id", order.id);
      throw new Error(
        `Failed to update QR code with image URL: ${updateError.message}`
      );
    }

    console.log("✅ QR code record updated with image URL");

    // Step 8: Update order with QR code reference
    const { data: finalOrder, error: finalOrderError } = await supabaseClient
      .from("orders")
      .update({
        qr_code_id: updatedQRCode.id,
        qr_code_data: qrCodeDataString,
      })
      .eq("id", order.id)
      .select()
      .single();

    if (finalOrderError) {
      // Rollback everything
      await supabaseClient.storage.from(STORAGE_BUCKET).remove([filename]);
      await supabaseClient.from("qr_codes").delete().eq("id", qrCodeRecord.id);
      await supabaseClient.from("orders").delete().eq("id", order.id);
      throw new Error(
        `Failed to update order with QR code ID: ${finalOrderError.message}`
      );
    }

    console.log("✅ Order updated with QR code reference");
    console.log("🎉 Atomized order creation completed successfully!");

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Order and QR code created successfully",
        data: {
          order: finalOrder,
          qrCode: updatedQRCode,
          qrCodeUrl: publicUrl,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error in atomized order creation:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
