// create-driver-account (Edge Function) with CORS and temp password generation - Open Access
import { createClient } from "npm:@supabase/supabase-js@2.26.0";
import { randomBytes } from "node:crypto";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*"; // set to specific origin for production

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
});

function corsHeaders() {
  return new Headers({
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, x-supabase-auth",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json",
  });
}

function generateTempPassword(length = 12) {
  const buf = randomBytes(Math.max(8, length));
  return buf
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, length);
}

Deno.serve(async (req) => {
  const headers = corsHeaders();
  
  if (req.method === "OPTIONS")
    return new Response(null, {
      status: 204,
      headers,
    });
    
  if (req.method !== "POST")
    return new Response(
      JSON.stringify({
        success: false,
        error: "Method not allowed",
      }),
      {
        status: 405,
        headers,
      }
    );
    
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Expected application/json",
        }),
        {
          status: 415,
          headers,
        }
      );
    }
    
    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();
    const full_name = body.full_name ? String(body.full_name).trim() : null;
    const phone = body.phone ? String(body.phone).trim() : null;
    let password = body.password ?? null; // null means generate
    
    if (!email)
      return new Response(
        JSON.stringify({
          success: false,
          error: "email is required",
        }),
        {
          status: 422,
          headers,
        }
      );
      
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid email format",
        }),
        {
          status: 422,
          headers,
        }
      );
    }
      
    if (
      password !== null &&
      typeof password === "string" &&
      password.length < 8
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "password must be at least 8 characters",
        }),
        {
          status: 422,
          headers,
        }
      );
    }
    
    let temporary_password = null;
    if (password === null) {
      temporary_password = generateTempPassword(12);
      password = temporary_password;
    }
    
    // Create user via admin API
    const { data: createData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      
    if (createError) {
      if (
        createError.status === 409 ||
        (createError.message &&
          createError.message.toLowerCase().includes("already"))
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Email already exists",
          }),
          {
            status: 409,
            headers,
          }
        );
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create auth user",
          detail: createError.message,
        }),
        {
          status: 500,
          headers,
        }
      );
    }
    
    const authUser = createData.user;
    if (!authUser || !authUser.id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Auth user creation failed",
        }),
        {
          status: 500,
          headers,
        }
      );
    }
    
    const userId = authUser.id;
    
    // Upsert into public.users
    const profile = {
      id: userId,
      email,
      full_name,
      phone,
      role: "driver",
      tenant_id: body.tenant_id || null,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    
    const { error: upsertError } = await supabaseAdmin
      .from("users")
      .upsert(profile, {
        onConflict: "id",
      });
      
    if (upsertError) {
      // rollback auth user
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (e) {
        console.error("rollback deleteUser failed", e);
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create user profile",
          detail: upsertError.message,
        }),
        {
          status: 500,
          headers,
        }
      );
    }
    
    // Insert into drivers table
    const driverRow = {
      id: userId,
      full_name,
      phone,
      license_number: body.license_number || null,
      license_expiry: body.license_expiry || null,
      tenant_id: body.tenant_id || null,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    
    const { error: driverError } = await supabaseAdmin
      .from("drivers")
      .insert(driverRow);
      
    if (driverError) {
      console.error("Driver row insertion failed:", driverError);
      // Return success with warning since user was created successfully
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: userId,
            full_name,
            email,
            temporary_password,
          },
          warning: "Driver row insertion failed - user created but not added to drivers table",
        }),
        {
          status: 201,
          headers,
        }
      );
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: userId,
          full_name,
          email,
          phone,
          temporary_password,
          message: temporary_password ? "Driver created with temporary password" : "Driver created successfully",
        },
      }),
      {
        status: 201,
        headers,
      }
    );
  } catch (err) {
    console.error("create-driver-account unexpected error", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        detail: err.message,
      }),
      {
        status: 500,
        headers: corsHeaders(),
      }
    );
  }
});
