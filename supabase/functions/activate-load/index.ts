// Edge Function: activate-load
// Description: Handles load activation by drivers with validation and location capture

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ActivateLoadRequest {
  order_id: string
  location?: {
    latitude: number
    longitude: number
  }
  location_address?: string
  device_info?: {
    app_version?: string
    platform?: string
    os_version?: string
  }
  notes?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'User not authenticated' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse request body
    const requestData: ActivateLoadRequest = await req.json()
    const { order_id, location, location_address, device_info, notes } = requestData

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'Bad Request', message: 'order_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`Activating load for order ${order_id} by user ${user.id}`)

    // Verify user is a driver
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'driver') {
      return new Response(
        JSON.stringify({ error: 'Forbidden', message: 'Only drivers can activate loads' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verify order exists and driver is assigned
    const { data: orderData, error: orderError } = await supabaseClient
      .from('orders')
      .select('id, status, assigned_driver_id')
      .eq('id', order_id)
      .single()

    if (orderError || !orderData) {
      return new Response(
        JSON.stringify({ error: 'Not Found', message: 'Order not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verify driver is assigned to this order
    if (orderData.assigned_driver_id !== user.id) {
      return new Response(
        JSON.stringify({ 
          error: 'Forbidden', 
          message: 'You are not assigned to this order' 
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verify order status allows activation
    if (!['created', 'assigned'].includes(orderData.status)) {
      return new Response(
        JSON.stringify({ 
          error: 'Conflict', 
          message: `Order cannot be activated in status: ${orderData.status}` 
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if load is already activated
    const { data: existingActivation } = await supabaseClient
      .from('load_activations')
      .select('id')
      .eq('order_id', order_id)
      .single()

    if (existingActivation) {
      return new Response(
        JSON.stringify({ 
          error: 'Conflict', 
          message: 'Load is already activated for this order' 
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Format location as PostGIS point if provided
    let locationPoint = null
    if (location?.latitude && location?.longitude) {
      locationPoint = `POINT(${location.longitude} ${location.latitude})`
    }

    // Create load activation record
    const { data: activationData, error: activationError } = await supabaseClient
      .from('load_activations')
      .insert({
        order_id: order_id,
        driver_id: user.id,
        activated_at: new Date().toISOString(),
        location: locationPoint,
        location_address: location_address || null,
        device_info: device_info || {},
        notes: notes || null,
      })
      .select()
      .single()

    if (activationError) {
      console.error('Error creating load activation:', activationError)
      return new Response(
        JSON.stringify({ 
          error: 'Internal Server Error', 
          message: 'Failed to activate load',
          details: activationError.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // The database trigger will automatically update the order status to 'activated'
    // and set load_activated_at and load_activated_by fields

    // Fetch updated order data
    const { data: updatedOrder, error: fetchError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (fetchError) {
      console.error('Error fetching updated order:', fetchError)
    }

    console.log(`Load activated successfully for order ${order_id}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Load activated successfully',
        data: {
          activation: activationData,
          order: updatedOrder || orderData,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal Server Error', 
        message: error.message || 'An unexpected error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
