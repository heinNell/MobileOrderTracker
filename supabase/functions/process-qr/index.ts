import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    
    // Use your QR secret for validation/signing
    const qrSecret = Deno.env.get('QR_CODE_SECRET') ?? '';
    
    // Process your QR code data here
    console.log('Processing QR data:', qrData);
    
    // Example: Store in database
    const { data, error } = await supabaseClient
      .from('qr_scans')
      .insert([{ 
        qr_data: qrData,
        scanned_at: new Date().toISOString()
      }]);
      
    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
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
