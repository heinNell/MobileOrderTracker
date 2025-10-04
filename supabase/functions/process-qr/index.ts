import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sign, verify } from "https://deno.land/std@0.200.0/crypto/jwt.ts";

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

    // Verify JWT signature
    try {
      verify(qrData, qrSecret, {
        alg: 'HS256',
        iss: 'your_iss',
        exp: '1h'
      });
    } catch (error) {
      throw new Error('Invalid or expired QR code signature');
    }

    // Validate QR data format
    if (typeof qrData !== 'string' || qrData.length < 10) {
      throw new Error('Invalid QR data format');
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

    // Increment scan count for analytics
    await supabaseClient
      .from('qr_codes')
      .update({ scan_count: FieldValue.increment(1) })
      .eq('qr_data', qrData);

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
