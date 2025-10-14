import { createClient } from 'npm:@supabase/supabase-js@2.26.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

const createAdminClient = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing environment variables');
  }
  
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

const generateTempPassword = (length = 12) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: corsHeaders }
      );
    }

    const requestData = await req.json();
    
    // Basic validation
    if (!requestData.driver_id || !requestData.email) {
      return new Response(
        JSON.stringify({ error: 'Driver ID and email are required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseAdmin = createAdminClient();
    const temporaryPassword = generateTempPassword();

    console.log('Resetting password for driver:', requestData.driver_id);

    // Verify driver exists and get their details
    const { data: driverData, error: driverError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role')
      .eq('id', requestData.driver_id)
      .eq('role', 'driver')
      .single();

    if (driverError || !driverData) {
      console.error('Driver not found:', driverError);
      return new Response(
        JSON.stringify({ error: 'Driver not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Verify email matches
    if (driverData.email.toLowerCase() !== requestData.email.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: 'Email mismatch' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Reset the password using admin API
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      requestData.driver_id,
      {
        password: temporaryPassword,
        // Optionally force password change on next login
        user_metadata: {
          ...driverData.user_metadata,
          password_reset_required: true,
          password_reset_at: new Date().toISOString()
        }
      }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update password: ' + updateError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('Password updated successfully for driver:', requestData.driver_id);

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          driver_id: requestData.driver_id,
          email: requestData.email,
          full_name: driverData.full_name,
          temporary_password: temporaryPassword,
          message: 'Password reset successfully'
        }
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});