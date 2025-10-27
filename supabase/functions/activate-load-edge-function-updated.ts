// Updated Edge Function for Order Activation - Production Ready
// Deploy this as: supabase/functions/activate-load/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Enhanced CORS headers for better compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400', // 24 hours
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Validate request method
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`)
    }

    // Parse and validate request body
    const body = await req.json()
    const { 
      order_id, 
      driver_id, 
      latitude, 
      longitude, 
      timestamp, 
      app_version = '1.0.0',
      notes = null
    } = body

    // Input validation
    if (!order_id || !driver_id) {
      throw new Error('Missing required fields: order_id and driver_id')
    }

    if (latitude && (latitude < -90 || latitude > 90)) {
      throw new Error('Invalid latitude value')
    }

    if (longitude && (longitude < -180 || longitude > 180)) {
      throw new Error('Invalid longitude value')
    }

    console.log(`Activating order ${order_id} for driver ${driver_id}`)

    // Verify the order exists and is assigned to this driver
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number, status, assigned_driver_id, user_id')
      .eq('id', order_id)
      .single()

    if (fetchError || !existingOrder) {
      throw new Error('Order not found')
    }

    if (existingOrder.assigned_driver_id !== driver_id) {
      throw new Error('Order not assigned to this driver')
    }

    if (existingOrder.status === 'active') {
      // Order already active, return success
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Order already active',
          order: existingOrder 
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          },
          status: 200
        }
      )
    }

    // Update order status and location
    const updateData = {
      status: 'active',
      activated_at: timestamp || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Add location data if provided
    if (latitude && longitude) {
      updateData.driver_location_lat = latitude
      updateData.driver_location_lng = longitude
    }

    // Update the order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order_id)
      .eq('assigned_driver_id', driver_id)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      throw new Error(`Failed to activate order: ${updateError.message}`)
    }

    // Insert location tracking record if coordinates provided
    if (latitude && longitude) {
      const { error: locationError } = await supabase
        .from('map_locations')
        .insert({
          order_id: order_id,
          user_id: driver_id,
          latitude: latitude,
          longitude: longitude,
          created_at: timestamp || new Date().toISOString()
        })

      if (locationError) {
        console.warn('Location tracking insert failed:', locationError)
        // Don't fail the whole request for location tracking issues
      }
    }

    // Log the activation for audit trail
    const { error: historyError } = await supabase
      .from('order_history')
      .insert({
        order_id: order_id,
        status: 'active',
        changed_by: driver_id,
        notes: notes || `Order activated via mobile app (v${app_version})`,
        created_at: timestamp || new Date().toISOString()
      })

    if (historyError) {
      console.warn('History insert failed:', historyError)
      // Don't fail the whole request for history issues
    }

    console.log(`Successfully activated order ${order_id}`)

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Order activated successfully',
        order: updatedOrder,
        activated_at: updateData.activated_at
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200
      }
    )

  } catch (error) {
    console.error('Edge function error:', error.message)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
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