import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create regular client for user session validation
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Verify the requesting user is authenticated and is admin/dispatcher
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user has permission to create drivers
    const { data: requestingUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (userError || !requestingUser) {
      throw new Error('User not found')
    }

    if (!['admin', 'dispatcher'].includes(requestingUser.role)) {
      throw new Error('Insufficient permissions')
    }

    // Parse request body
    const { email, full_name, phone, password } = await req.json()

    // Validate required fields
    if (!email || !full_name || !password) {
      throw new Error('Missing required fields: email, full_name, password')
    }

    // Generate a secure password if not provided
    const driverPassword = password || generateSecurePassword()

    // Create the user in Supabase Auth
    const { data: authUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: driverPassword,
      email_confirm: true, // Auto-confirm email for admin-created accounts
      user_metadata: {
        full_name: full_name,
        role: 'driver',
        created_by: user.id,
        tenant_id: requestingUser.tenant_id
      }
    })

    if (createAuthError) {
      throw new Error(`Failed to create auth user: ${createAuthError.message}`)
    }

    if (!authUser.user) {
      throw new Error('Auth user creation failed')
    }

    // Create the user profile in the users table
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user.id,
        email: email,
        full_name: full_name,
        phone: phone || null,
        role: 'driver',
        tenant_id: requestingUser.tenant_id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (profileError) {
      // If profile creation fails, we should clean up the auth user
      console.error('Profile creation failed:', profileError)
      
      // Attempt to delete the auth user
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError)
      }
      
      throw new Error(`Failed to create user profile: ${profileError.message}`)
    }

    // Send welcome email to the new driver with credentials
    // In production, you might want to use a proper email service
    const welcomeEmailSent = await sendWelcomeEmail(email, full_name, driverPassword)

    console.log(`Successfully created driver account: ${email}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Driver account created successfully',
        data: {
          id: authUser.user.id,
          email: email,
          full_name: full_name,
          phone: phone,
          role: 'driver',
          tenant_id: requestingUser.tenant_id,
          is_active: true,
          welcome_email_sent: welcomeEmailSent,
          temporary_password: driverPassword // In production, don't return this
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error creating driver account:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    )
  }
})

// Helper function to generate a secure password
function generateSecurePassword(): string {
  const length = 12
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
  let password = ""
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  
  return password
}

// Helper function to send welcome email
async function sendWelcomeEmail(email: string, fullName: string, password: string): Promise<boolean> {
  try {
    // In a real implementation, you would integrate with an email service like:
    // - SendGrid
    // - AWS SES
    // - Resend
    // - Supabase Edge Functions with email templates
    
    console.log(`Welcome email would be sent to ${email} with credentials`)
    console.log(`Name: ${fullName}`)
    console.log(`Temporary Password: ${password}`)
    console.log(`Login URL: ${Deno.env.get('MOBILE_APP_URL') || 'https://magnificent-snickerdoodle-018e86.netlify.app'}`)
    
    // For now, just return true
    // In production, implement actual email sending here
    return true
  } catch (error) {
    console.error('Failed to send welcome email:', error)
    return false
  }
}