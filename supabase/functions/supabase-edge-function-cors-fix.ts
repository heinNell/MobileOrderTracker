// Edge Function CORS Fix for activate-load
// This file should be placed in your Supabase project under supabase/functions/activate-load/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { order_id, driver_id, latitude, longitude, timestamp, app_version } = await req.json()

    // Your existing activation logic here
    const { data, error } = await supabaseClient
      .from('orders')
      .update({
        status: 'active',
        activated_at: timestamp,
        driver_location_lat: latitude,
        driver_location_lng: longitude
      })
      .eq('id', order_id)
      .eq('assigned_driver_id', driver_id)

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 400
      }
    )
  }
})