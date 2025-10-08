import { createClient } from "npm:@supabase/supabase-js@2.26.0";
import { randomBytes } from "node:crypto";
// Environment configuration with validation
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*"; // Set to specific origin in production
const RATE_LIMIT_WINDOW_MS = parseInt(Deno.env.get("RATE_LIMIT_WINDOW_MS") || "60000"); // 1 minute default
const RATE_LIMIT_MAX_REQUESTS = parseInt(Deno.env.get("RATE_LIMIT_MAX_REQUESTS") || "10"); // 10 requests per window
const LOG_LEVEL = Deno.env.get("LOG_LEVEL") || "info"; // debug, info, warn, error
const REQUEST_TIMEOUT_MS = parseInt(Deno.env.get("REQUEST_TIMEOUT_MS") || "15000"); // 15 seconds timeout
const MIN_PASSWORD_LENGTH = parseInt(Deno.env.get("MIN_PASSWORD_LENGTH") || "12"); // Minimum password length
// Environment validation
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("CRITICAL: Missing required environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY");
// In production, you might want to exit or throw an error
// For Edge Functions, we'll continue but log the error
}
// Logging utility with timestamps and request IDs
const createLogger = (requestId)=>{
  const timestamp = ()=>new Date().toISOString();
  const formatMessage = (level, ...args)=>{
    return `[${timestamp()}][${level}][${requestId}] ${args.join(" ")}`;
  };
  return {
    debug: (...args)=>{
      if ([
        "debug"
      ].includes(LOG_LEVEL)) console.debug(formatMessage("DEBUG", ...args));
    },
    info: (...args)=>{
      if ([
        "debug",
        "info"
      ].includes(LOG_LEVEL)) console.info(formatMessage("INFO", ...args));
    },
    warn: (...args)=>{
      if ([
        "debug",
        "info",
        "warn"
      ].includes(LOG_LEVEL)) console.warn(formatMessage("WARN", ...args));
    },
    error: (...args)=>{
      if ([
        "debug",
        "info",
        "warn",
        "error"
      ].includes(LOG_LEVEL)) console.error(formatMessage("ERROR", ...args));
    }
  };
};
// Supabase client with retry configuration
const createSupabaseClient = ()=>{
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Cannot create Supabase client: Missing required environment variables");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        "x-application-name": "driver-management-system"
      }
    },
    // Add timeout for network resilience
    fetch: (url, options)=>{
      return fetch(url, {
        ...options,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
    }
  });
};
// Simple in-memory rate limiter (would use Redis in production)
const ipRequestCounts = new Map();
const cleanupInterval = setInterval(()=>{
  const now = Date.now();
  for (const [ip, data] of ipRequestCounts.entries()){
    if (now - data.timestamp > RATE_LIMIT_WINDOW_MS) {
      ipRequestCounts.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS);
// Rate limiting middleware
const checkRateLimit = (ip, logger)=>{
  const now = Date.now();
  if (!ipRequestCounts.has(ip)) {
    ipRequestCounts.set(ip, {
      count: 1,
      timestamp: now
    });
    return {
      limited: false
    };
  }
  const data = ipRequestCounts.get(ip);
  // Reset if window expired
  if (now - data.timestamp > RATE_LIMIT_WINDOW_MS) {
    ipRequestCounts.set(ip, {
      count: 1,
      timestamp: now
    });
    return {
      limited: false
    };
  }
  // Check if over limit
  if (data.count >= RATE_LIMIT_MAX_REQUESTS) {
    logger.warn(`Rate limit exceeded for IP: ${ip}`);
    return {
      limited: true,
      retryAfter: Math.ceil((data.timestamp + RATE_LIMIT_WINDOW_MS - now) / 1000)
    };
  }
  // Increment counter
  data.count++;
  ipRequestCounts.set(ip, data);
  return {
    limited: false
  };
};
// CORS headers with configurable origin
function corsHeaders() {
  return new Headers({
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, x-supabase-auth, x-request-id",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
  });
}
// Enhanced password generation with guaranteed complexity
function generateTempPassword(length = MIN_PASSWORD_LENGTH) {
  if (length < MIN_PASSWORD_LENGTH) length = MIN_PASSWORD_LENGTH; // Minimum secure length
  const uppercaseChars = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // No I, O (easily confused)
  const lowercaseChars = "abcdefghijkmnpqrstuvwxyz"; // No l, o (easily confused)
  const numberChars = "23456789"; // No 0, 1 (easily confused)
  const specialChars = "!@#$%^&*()-_=+[]{}|;:,.<>?";
  // Ensure at least one of each character type
  let password = "";
  password += uppercaseChars[randomBytes(1)[0] % uppercaseChars.length];
  password += lowercaseChars[randomBytes(1)[0] % lowercaseChars.length];
  password += numberChars[randomBytes(1)[0] % numberChars.length];
  password += specialChars[randomBytes(1)[0] % specialChars.length];
  // Fill the rest randomly
  const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
  const remainingLength = length - 4;
  const bytes = randomBytes(remainingLength);
  for(let i = 0; i < remainingLength; i++){
    password += allChars[bytes[i] % allChars.length];
  }
  // Shuffle the password characters
  const passwordArray = password.split("");
  for(let i = passwordArray.length - 1; i > 0; i--){
    const j = Math.floor(randomBytes(1)[0] / 255 * (i + 1));
    [passwordArray[i], passwordArray[j]] = [
      passwordArray[j],
      passwordArray[i]
    ];
  }
  return passwordArray.join("");
}
// Input sanitization and validation
const validateInput = (input, logger)=>{
  const errors = [];
  const sanitized = {};
  // Email validation
  if (!input.email) {
    errors.push("Email is required");
  } else {
    sanitized.email = String(input.email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized.email)) {
      errors.push("Invalid email format");
    }
    // Additional email validation - check length
    if (sanitized.email.length > 255) {
      errors.push("Email exceeds maximum length (255 characters)");
    }
  }
  // Full name validation
  if (!input.full_name) {
    errors.push("Full name is required");
  } else {
    sanitized.full_name = String(input.full_name).trim();
    // Check for reasonable length and potential XSS
    if (sanitized.full_name.length > 100) {
      errors.push("Full name exceeds maximum length (100 characters)");
    }
    if (/[<>]/.test(sanitized.full_name)) {
      errors.push("Full name contains invalid characters");
    }
  }
  // Phone validation (optional)
  if (input.phone !== undefined) {
    if (input.phone === null || input.phone === "") {
      sanitized.phone = null;
    } else {
      sanitized.phone = String(input.phone).trim();
      const phoneRegex = /^\+?[1-9]\d{1,14}$/; // Basic E.164
      if (!phoneRegex.test(sanitized.phone)) {
        errors.push("Invalid phone format (e.g., +1234567890)");
      }
    }
  }
  // Password validation (optional)
  if (input.password !== undefined && input.password !== null) {
    sanitized.password = String(input.password);
    if (sanitized.password.length < MIN_PASSWORD_LENGTH) {
      errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(sanitized.password);
    const hasLowerCase = /[a-z]/.test(sanitized.password);
    const hasNumbers = /\d/.test(sanitized.password);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(sanitized.password);
    if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChars)) {
      errors.push("Password must include uppercase, lowercase, numbers, and special characters");
    }
  } else {
    sanitized.password = null; // Will generate one later
  }
  // Tenant ID validation (optional, UUID format if provided)
  if (input.tenant_id !== undefined) {
    if (input.tenant_id === null || input.tenant_id === "") {
      sanitized.tenant_id = null;
    } else {
      sanitized.tenant_id = String(input.tenant_id);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(sanitized.tenant_id)) {
        errors.push("Invalid tenant_id format (must be UUID)");
      }
    }
  }
  // License number validation (optional)
  if (input.license_number !== undefined) {
    if (input.license_number === null || input.license_number === "") {
      sanitized.license_number = null;
    } else {
      sanitized.license_number = String(input.license_number).trim();
      // Check for reasonable length
      if (sanitized.license_number.length > 50) {
        errors.push("License number exceeds maximum length (50 characters)");
      }
    }
  }
  // License expiry validation (optional)
  if (input.license_expiry !== undefined) {
    if (input.license_expiry === null || input.license_expiry === "") {
      sanitized.license_expiry = null;
    } else {
      sanitized.license_expiry = String(input.license_expiry);
      // Validate date format (ISO format)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(sanitized.license_expiry)) {
        errors.push("Invalid license expiry date format (use YYYY-MM-DD)");
      } else {
        // Check if date is valid
        const date = new Date(sanitized.license_expiry);
        if (isNaN(date.getTime())) {
          errors.push("Invalid license expiry date");
        } else if (date < new Date()) {
          errors.push("License expiry date must be in the future");
        }
      }
    }
  }
  return {
    errors,
    sanitized
  };
};
// Main request handler
Deno.serve(async (req)=>{
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);
  const headers = corsHeaders();
  headers.set("X-Request-ID", requestId);
  // Get client IP for rate limiting
  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  try {
    // Handle OPTIONS request (CORS preflight)
    if (req.method === "OPTIONS") {
      logger.debug(`CORS preflight request from ${clientIP}`);
      return new Response(null, {
        status: 204,
        headers
      });
    }
    // Enforce POST method
    if (req.method !== "POST") {
      logger.warn(`Method not allowed: ${req.method} from ${clientIP}`);
      return new Response(JSON.stringify({
        success: false,
        error: "Method not allowed",
        request_id: requestId
      }), {
        status: 405,
        headers
      });
    }
    // Check rate limit
    const rateLimitCheck = checkRateLimit(clientIP, logger);
    if (rateLimitCheck.limited) {
      headers.set("Retry-After", String(rateLimitCheck.retryAfter));
      return new Response(JSON.stringify({
        success: false,
        error: "Rate limit exceeded",
        retry_after: rateLimitCheck.retryAfter,
        request_id: requestId
      }), {
        status: 429,
        headers
      });
    }
    // Validate content type
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      logger.warn(`Invalid content type: ${contentType} from ${clientIP}`);
      return new Response(JSON.stringify({
        success: false,
        error: "Expected application/json",
        request_id: requestId
      }), {
        status: 415,
        headers
      });
    }
    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      logger.error(`Failed to parse JSON body: ${e.message}`);
      return new Response(JSON.stringify({
        success: false,
        error: "Invalid JSON in request body",
        request_id: requestId
      }), {
        status: 400,
        headers
      });
    }
    logger.debug(`Received request to create driver: ${JSON.stringify({
      email: body.email,
      full_name: body.full_name,
      has_phone: !!body.phone,
      has_tenant: !!body.tenant_id,
      has_license: !!body.license_number
    })}`);
    // Validate and sanitize input
    const { errors, sanitized } = validateInput(body, logger);
    if (errors.length > 0) {
      logger.warn(`Validation errors: ${errors.join(", ")}`);
      return new Response(JSON.stringify({
        success: false,
        error: "Validation failed",
        validation_errors: errors,
        request_id: requestId
      }), {
        status: 422,
        headers
      });
    }
    // Generate password if needed
    let temporary_password = null;
    if (sanitized.password === null) {
      temporary_password = generateTempPassword();
      sanitized.password = temporary_password;
      logger.info("Generated temporary password for new driver");
    }
    // Initialize Supabase client
    let supabaseAdmin;
    try {
      supabaseAdmin = createSupabaseClient();
    } catch (err) {
      logger.error(`Failed to initialize Supabase client: ${err.message}`);
      return new Response(JSON.stringify({
        success: false,
        error: "Server configuration error",
        request_id: requestId
      }), {
        status: 500,
        headers
      });
    }
    // Create user via admin API with retries
    let authUser = null;
    let createError = null;
    const maxRetries = 2;
    for(let attempt = 0; attempt <= maxRetries; attempt++){
      try {
        logger.debug(`Creating auth user, attempt ${attempt + 1}`);
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: sanitized.email,
          password: sanitized.password,
          email_confirm: true
        });
        if (error) {
          createError = error;
          logger.warn(`Auth user creation failed (attempt ${attempt + 1}): ${error.message}`);
          if (error.status === 409 || error.message && error.message.toLowerCase().includes("already")) {
            break;
          }
          // Wait before retry (exponential backoff)
          if (attempt < maxRetries) {
            const backoffMs = Math.pow(2, attempt) * 500;
            await new Promise((resolve)=>setTimeout(resolve, backoffMs));
          }
        } else {
          authUser = data.user;
          createError = null;
          break;
        }
      } catch (err) {
        logger.error(`Unexpected error during auth user creation: ${err.message}`);
        createError = {
          message: err.message
        };
      }
    }
    // Handle auth user creation failure
    if (createError || !authUser) {
      if (createError && (createError.status === 409 || createError.message && createError.message.toLowerCase().includes("already"))) {
        logger.warn(`Email already exists: ${sanitized.email}`);
        return new Response(JSON.stringify({
          success: false,
          error: "Email already exists",
          request_id: requestId
        }), {
          status: 409,
          headers
        });
      }
      logger.error(`Failed to create auth user after ${maxRetries + 1} attempts`);
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to create auth user",
        detail: createError ? createError.message : "Unknown error",
        request_id: requestId
      }), {
        status: 500,
        headers
      });
    }
    const userId = authUser.id;
    logger.info(`Auth user created successfully with ID: ${userId}`);
    // Transaction-like operations with rollback capability
    let success = true;
    const dbErrors = [];
    const now = new Date().toISOString();
    // Step 1: Upsert into public.users
    try {
      const profile = {
        id: userId,
        email: sanitized.email,
        full_name: sanitized.full_name,
        phone: sanitized.phone,
        role: "driver",
        tenant_id: sanitized.tenant_id,
        is_active: true,
        created_at: now,
        updated_at: now
      };
      logger.debug(`Inserting user profile: ${JSON.stringify(profile)}`);
      const { error: upsertError } = await supabaseAdmin.from("users").upsert(profile, {
        onConflict: "id"
      });
      if (upsertError) {
        logger.error(`Failed to create user profile: ${upsertError.message}`);
        success = false;
        dbErrors.push(`User profile creation failed: ${upsertError.message}`);
      }
    } catch (err) {
      logger.error(`Exception during user profile creation: ${err.message}`);
      success = false;
      dbErrors.push(`User profile exception: ${err.message}`);
    }
    // Step 2: Insert into drivers table
    try {
      const driverRow = {
        id: userId,
        full_name: sanitized.full_name,
        phone: sanitized.phone,
        license_number: sanitized.license_number,
        license_expiry: sanitized.license_expiry,
        tenant_id: sanitized.tenant_id,
        is_active: true,
        created_at: now,
        updated_at: now
      };
      logger.debug(`Inserting driver record: ${JSON.stringify(driverRow)}`);
      const { error: driverError } = await supabaseAdmin.from("drivers").insert(driverRow);
      if (driverError) {
        logger.error(`Failed to create driver record: ${driverError.message}`);
        success = false;
        dbErrors.push(`Driver record creation failed: ${driverError.message}`);
      }
    } catch (err) {
      logger.error(`Exception during driver record creation: ${err.message}`);
      success = false;
      dbErrors.push(`Driver record exception: ${err.message}`);
    }
    // Rollback if any step failed
    if (!success) {
      logger.warn(`Rolling back auth user due to errors: ${dbErrors.join(", ")}`);
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        logger.info(`Auth user ${userId} deleted during rollback`);
      } catch (e) {
        logger.error(`Rollback failed, could not delete auth user: ${e.message}`);
        dbErrors.push(`Rollback failed: ${e.message}`);
      }
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to create driver account",
        details: dbErrors,
        request_id: requestId
      }), {
        status: 500,
        headers
      });
    }
    // All operations successful
    logger.info(`Driver account created successfully: ${userId}`);
    return new Response(JSON.stringify({
      success: true,
      data: {
        id: userId,
        full_name: sanitized.full_name,
        email: sanitized.email,
        phone: sanitized.phone,
        temporary_password,
        message: temporary_password ? "Driver created with temporary password" : "Driver created successfully"
      },
      request_id: requestId
    }), {
      status: 201,
      headers
    });
  } catch (err) {
    // Catch-all for unexpected errors
    logger.error(`Unhandled exception: ${err.message}`, err.stack);
    return new Response(JSON.stringify({
      success: false,
      error: "Internal server error",
      detail: "An unexpected error occurred",
      request_id: requestId
    }), {
      status: 500,
      headers
    });
  }
});
