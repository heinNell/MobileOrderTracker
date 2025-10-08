import { createClient } from "npm:@supabase/supabase-js@2.26.0";
import { randomBytes } from "node:crypto";

// Type imports from Supabase (assuming you have types installed; if not, use npm:@supabase/supabase-js)
import type { AdminUserAttributes } from "npm:@supabase/supabase-js@2.26.0";

// Deno-specific types
declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve: (handler: (req: Request) => Promise<Response>) => void;
};

const SUPABASE_URL: string = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY: string =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ALLOWED_ORIGIN: string = Deno.env.get("ALLOWED_ORIGIN") || "*"; // set to specific origin for production

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
});

function corsHeaders(): Headers {
  return new Headers({
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, x-client-info, x-supabase-auth",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json",
  });
}

function generateTempPassword(length: number = 12): string {
  // Generate a secure password with letters, numbers, and special chars
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
  let password = "";
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

Deno.serve(async (req: Request): Promise<Response> => {
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

    const body: Record<string, unknown> = await req.json();
    const email: string = ((body.email as string) || "").trim().toLowerCase();
    const full_name: string | null = body.full_name
      ? String(body.full_name).trim()
      : null;
    const phone: string | null = body.phone ? String(body.phone).trim() : null;
    let password: string | null = (body.password as string | null) ?? null; // null means generate
    const tenant_id: string | null = body.tenant_id
      ? String(body.tenant_id)
      : null;
    const license_number: string | null = body.license_number
      ? String(body.license_number).trim()
      : null;
    const license_expiry: string | null = body.license_expiry
      ? String(body.license_expiry)
      : null;

    // Required fields
    if (!email || !full_name) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "email and full_name are required",
        }),
        {
          status: 422,
          headers,
        }
      );
    }

    // Email validation
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

    // Phone validation (optional, but if provided)
    if (phone) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/; // Basic E.164
      if (!phoneRegex.test(phone)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid phone format (e.g., +1234567890)",
          }),
          {
            status: 422,
            headers,
          }
        );
      }
    }

    // Tenant ID validation (optional, UUID format if provided)
    if (tenant_id) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(tenant_id)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid tenant_id format (must be UUID)",
          }),
          {
            status: 422,
            headers,
          }
        );
      }
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

    let temporary_password: string | null = null;
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
      } as AdminUserAttributes);

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

    const userId: string = authUser.id;

    // Upsert into public.users
    const profile: Record<string, unknown> = {
      id: userId,
      email,
      full_name,
      phone,
      role: "driver",
      tenant_id: tenant_id,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabaseAdmin
      .from("users")
      .upsert(profile, {
        onConflict: "id",
      });

    if (upsertError) {
      // Rollback auth user
      let rollbackError: string | null = null;
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (e: unknown) {
        console.error("Rollback deleteUser failed", e);
        rollbackError = (e as Error).message;
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create user profile",
          detail: upsertError.message,
          rollback_error: rollbackError,
        }),
        {
          status: 500,
          headers,
        }
      );
    }

    // Driver profile creation successful!
    // All driver info is stored in users table with role='driver'
    // No separate drivers table needed in our schema

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: userId,
          full_name,
          email,
          phone,
          temporary_password,
          message: temporary_password
            ? "Driver created with temporary password"
            : "Driver created successfully",
        },
      }),
      {
        status: 201,
        headers,
      }
    );
  } catch (err: unknown) {
    console.error("create-driver-account unexpected error", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        detail: errorMessage,
      }),
      {
        status: 500,
        headers: corsHeaders(),
      }
    );
  }
});
