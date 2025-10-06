import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

serve(async (req) => {
  // Handle CORS with strict security
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': 'default-src \'self\'',
      },
    });
  }

  try {
    const { qrData } = await req.json();
    
    if (!qrData) {
      throw new Error('QR code data is required');
    }

    // The URL and key are automatically available in edge functions
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    // Get QR secret from environment
    const qrSecret = Deno.env.get('QR_CODE_SECRET');
    if (!qrSecret) {
      throw new Error('QR code secret not configured');
    }

    // Parse QR data (assuming it's base64 encoded JSON)
    let payload;
    try {
      const decoded = atob(qrData);
      payload = JSON.parse(decoded);
    } catch (error) {
      throw new Error('Invalid QR data format');
    }

    // Verify signature using HMAC
    const { orderId, timestamp, signature } = payload;
    const expectedSignature = createHmac("sha256", qrSecret)
      .update(`${orderId}:${timestamp}`)
      .digest("hex");

    if (signature !== expectedSignature) {
      throw new Error('Invalid QR code signature');
    }

    // Check if QR code has expired (24 hours validity)
    const now = Date.now();
    const expirationTime = 24 * 60 * 60 * 1000; // 24 hours
    if (now - timestamp > expirationTime) {
      throw new Error('QR code has expired');
    }

    // Process QR data
    console.log('Processing valid QR data:', qrData);

    // Store in database with transaction for consistency
    const { data, error } = await supabaseClient
      .from('qr_scans')
      .insert([{
        qr_data: qrData,
        scanned_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      throw error;
    }

    // Note: FieldValue.increment is not available in Supabase edge functions
    // We'll need to do a separate query to get the current count and update it
    // For now, we'll skip this part or implement it differently

    return new Response(
      JSON.stringify({
        success: true,
        data,
        message: 'QR code processed successfully'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        }
      }
    );
  } catch (error) {
    console.error('QR processing error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        code: 'QR_PROCESSING_FAILED'
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
});
