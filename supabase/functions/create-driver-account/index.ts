import { createClient } from 'npm:@supabase/supabase-js@2.26.0';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};
const createAdminClient = ()=>{
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
const generateTempPassword = (length = 12)=>{
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  for(let i = 0; i < length; i++){
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
};
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: corsHeaders
      });
    }
    const requestData = await req.json();
    // Basic validation
    if (!requestData.email || !requestData.full_name) {
      return new Response(JSON.stringify({
        error: 'Email and full name are required'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    const supabaseAdmin = createAdminClient();
    const temporaryPassword = generateTempPassword();
    console.log('Creating driver account for:', requestData.email);
    // Step 1: Create auth user
    let authData, authError;
    try {
      const authResult = await supabaseAdmin.auth.admin.createUser({
        email: requestData.email.trim().toLowerCase(),
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          full_name: requestData.full_name,
          role: 'driver'
        }
      });
      authData = authResult.data;
      authError = authResult.error;
    } catch (createError: any) {
      console.error('Auth creation exception:', createError);
      return new Response(JSON.stringify({
        error: 'Auth creation failed: ' + (createError?.message || 'Unknown error'),
        details: createError?.toString()
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    
    if (authError) {
      console.error('Auth creation error:', authError);
      console.error('Auth error details:', JSON.stringify(authError, null, 2));
      
      // Check for specific error types
      if (authError.message?.includes('already exists') || authError.message?.includes('duplicate')) {
        return new Response(JSON.stringify({
          error: 'Email already exists. Please use a different email address.',
          details: authError.message
        }), {
          status: 409,
          headers: corsHeaders
        });
      }
      
      if (authError.message?.includes('rate limit')) {
        return new Response(JSON.stringify({
          error: 'Rate limit exceeded. Please try again in a few minutes.',
          details: authError.message
        }), {
          status: 429,
          headers: corsHeaders
        });
      }
      
      if (authError.message?.includes('invalid email')) {
        return new Response(JSON.stringify({
          error: 'Invalid email format',
          details: authError.message
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
      
      return new Response(JSON.stringify({
        error: 'Auth creation failed: ' + authError.message,
        details: authError,
        hint: 'Check Supabase Auth settings and email provider configuration'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    if (!authData.user) {
      return new Response(JSON.stringify({
        error: 'No user data returned'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    const userId = authData.user.id;
    const timestamp = new Date().toISOString();
    console.log('Auth user created:', userId);
    // Step 2: Create user profile
    const userProfile = {
      id: userId,
      email: requestData.email.trim().toLowerCase(),
      full_name: requestData.full_name.trim(),
      phone: requestData.phone || null,
      role: 'driver',
      tenant_id: requestData.tenant_id || null,
      is_active: true,
      created_at: timestamp,
      updated_at: timestamp
    };
    const { error: profileError } = await supabaseAdmin.from('users').upsert(userProfile);
    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({
        error: 'Profile creation failed: ' + profileError.message
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    console.log('User profile created:', userId);
    // Step 3: Create driver record
    const driverData = {
      id: userId,
      full_name: requestData.full_name.trim(),
      phone: requestData.phone || null,
      license_number: requestData.license_number || null,
      license_expiry: requestData.license_expiry || null,
      tenant_id: requestData.tenant_id || null,
      is_active: true,
      created_at: timestamp,
      updated_at: timestamp
    };
    const { error: driverError } = await supabaseAdmin.from('drivers').upsert(driverData);
    if (driverError) {
      console.error('Driver record error:', driverError);
    // Continue - user account is still created
    } else {
      console.log('Driver record created:', userId);
    }
    // Success
    return new Response(JSON.stringify({
      success: true,
      data: {
        id: userId,
        email: requestData.email,
        full_name: requestData.full_name,
        temporary_password: temporaryPassword,
        message: 'Driver account created successfully'
      }
    }), {
      status: 201,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Unhandled error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
