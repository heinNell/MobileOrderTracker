import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the request URL and path
    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Handle save-location endpoint
    if (path === 'save-location') {
      const { latitude, longitude, address, placeName, placeId, locationType, notes } = await req.json()
      
      // Insert the location into your database
      const { data, error } = await supabaseClient
        .from('locations')
        .insert([
          { 
            latitude, 
            longitude, 
            address, 
            place_name: placeName, 
            place_id: placeId, 
            location_type: locationType, 
            notes 
          }
        ])
        .select()

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle nearby-locations endpoint
    if (path === 'nearby-locations') {
      const { latitude, longitude, radiusInMeters } = await req.json()
      
      // This is a simplified example - you would need to implement 
      // actual proximity search logic here, possibly using PostGIS
      const { data, error } = await supabaseClient
        .from('locations')
        .select('*')
        
      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
