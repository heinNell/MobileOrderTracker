// src/utils/qrUtils.ts
import * as Crypto from "expo-crypto";
import Constants from "expo-constants";

/**
 * QR Code payload interface
 */
export interface QRCodePayload {
  orderId: string;
  orderNumber?: string;
  tenantId: string;
  timestamp: number;
  signature: string;
  version?: string;
  expiresAt?: number; // Optional expiration timestamp
  metadata?: Record<string, any>; // Additional metadata
}

/**
 * QR Code validation result
 */
export interface QRValidationResult {
  isValid: boolean;
  error?: string;
  payload?: QRCodePayload;
}

// Get secret from environment
const QR_SECRET = 
  process.env.EXPO_PUBLIC_QR_CODE_SECRET || 
  Constants.expoConfig?.extra?.qrSecretKey;

const QR_CODE_VERSION = "1.0";
const MAX_TIMESTAMP_SKEW_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_EXPIRATION_HOURS = 24;

/**
 * Decode Base64 string with URL-safe character handling (React Native safe)
 */
export function decodeBase64(input: string): string {
  try {
    if (typeof input !== "string" || input.length === 0) return "";
    if (input.startsWith("http") || input.includes("://")) return input;

    // Handle URL-safe base64
    const cleaned = input.replace(/-/g, "+").replace(/_/g, "/");
    const pad = cleaned.length % 4 ? 4 - (cleaned.length % 4) : 0;
    const padded = cleaned + "=".repeat(pad);

    // Use Buffer (polyfilled in React Native)
    const buffer = Buffer.from(padded, "base64");
    return new TextDecoder("utf-8").decode(buffer);
  } catch (error) {
    console.warn("[qrUtils] Base64 decode failed:", error);
    return input;
  }
}

/**
 * Encode string to Base64 with URL-safe characters (React Native safe)
 */
export function encodeBase64(input: string): string {
  try {
    if (typeof input !== "string") return "";

    const encoded = Buffer.from(input, "utf-8").toString("base64");
    // Convert to URL-safe base64
    return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  } catch (error) {
    console.warn("[qrUtils] Base64 encode failed:", error);
    return "";
  }
}

/**
 * Decode Base64 JSON with type safety
 */
export function decodeBase64Json<T = any>(input: string): T | null {
  try {
    const decoded = decodeBase64(input);
    if (!decoded) return null;
    return JSON.parse(decoded) as T;
  } catch (error) {
    console.warn("[qrUtils] Base64 JSON decode failed:", error);
    return null;
  }
}

/**
 * Encode object to Base64 JSON
 */
export function encodeBase64Json<T = any>(obj: T): string {
  try {
    const jsonString = JSON.stringify(obj);
    return encodeBase64(jsonString);
  } catch (error) {
    console.warn("[qrUtils] Base64 JSON encode failed:", error);
    return "";
  }
}

/**
 * Parse QR code data to extract payload (JSON or base64 only)
 */
export function parseQRCodeData(qrData: string): QRCodePayload | null {
  try {
    if (!qrData || typeof qrData !== "string") return null;

    // Try direct JSON parse first
    try {
      const payload = JSON.parse(qrData) as QRCodePayload;
      if (isValidPayloadStructure(payload)) {
        return payload;
      }
    } catch {
      // Not direct JSON, fall back to base64
    }

    // Try base64 JSON decode
    const decoded = decodeBase64Json<QRCodePayload>(qrData);
    if (decoded && isValidPayloadStructure(decoded)) {
      return decoded;
    }

    return null;
  } catch (error) {
    console.warn("[qrUtils] QR code data parse failed:", error);
    return null;
  }
}

/**
 * Check if payload has required structure
 */
function isValidPayloadStructure(payload: any): boolean {
  return !!(
    payload &&
    typeof payload === "object" &&
    payload.orderId &&
    payload.tenantId &&
    payload.signature &&
    typeof payload.timestamp === "number"
  );
}

/**
 * Generate HMAC signature for QR code payload
 */
export async function generateSignature(
  orderId: string,
  timestamp: number,
  tenantId: string,
  orderNumber?: string
): Promise<string> {
  if (!QR_SECRET) {
    throw new Error("QR_CODE_SECRET not configured");
  }

  // Create canonical message (consistent ordering)
  const message = [orderId, timestamp, tenantId, orderNumber || ""].join(".");
  
  // Generate HMAC-SHA256
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    message + QR_SECRET
  );

  return digest;
}

/**
 * Verify QR code signature with enhanced security
 */
export async function verifySignature(payload: QRCodePayload): Promise<boolean> {
  try {
    // 1. Basic payload validation
    if (!isValidPayloadStructure(payload)) {
      console.error("[qrUtils] Invalid payload structure");
      return false;
    }

    // 2. Check if secret is configured
    if (!QR_SECRET) {
      if (__DEV__) {
        console.warn("[qrUtils] QR_CODE_SECRET not set; allowing in dev mode");
        return true; // Allow in development
      }
      console.error("[qrUtils] QR_CODE_SECRET not configured in production");
      return false; // Fail closed in production
    }

    // 3. Timestamp validation (prevent replay attacks)
    const now = Date.now();
    const timeDiff = Math.abs(now - payload.timestamp);
    
    if (timeDiff > MAX_TIMESTAMP_SKEW_MS) {
      console.error("[qrUtils] Timestamp skew too large:", timeDiff, "ms");
      return false;
    }

    // 4. Expiration check (if provided)
    if (payload.expiresAt && now > payload.expiresAt) {
      console.error("[qrUtils] QR code expired");
      return false;
    }

    // 5. Generate expected signature
    const expectedSignature = await generateSignature(
      payload.orderId,
      payload.timestamp,
      payload.tenantId,
      payload.orderNumber
    );

    // 6. Constant-time comparison to prevent timing attacks
    const isValid = constantTimeCompare(expectedSignature, payload.signature);

    if (!isValid) {
      console.error("[qrUtils] Signature mismatch");
    }

    return isValid;
  } catch (error) {
    console.error("[qrUtils] Signature verification failed:", error);
    return false;
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Comprehensive QR code validation
 */
export async function validateQRCode(
  qrData: string,
  expectedTenantId?: string
): Promise<QRValidationResult> {
  try {
    // 1. Parse QR code data
    const payload = parseQRCodeData(qrData);
    if (!payload) {
      return {
        isValid: false,
        error: "Invalid QR code format",
      };
    }

    // 2. Check version compatibility (if specified)
    if (payload.version && payload.version !== QR_CODE_VERSION) {
      return {
        isValid: false,
        error: `Unsupported QR code version: ${payload.version}`,
        payload,
      };
    }

    // 3. Verify tenant (if provided)
    if (expectedTenantId && payload.tenantId !== expectedTenantId) {
      return {
        isValid: false,
        error: "QR code belongs to a different organization",
        payload,
      };
    }

    // 4. Check expiration
    const now = Date.now();
    if (payload.expiresAt && now > payload.expiresAt) {
      return {
        isValid: false,
        error: "QR code has expired",
        payload,
      };
    }

    // 5. Verify signature
    const signatureValid = await verifySignature(payload);
    if (!signatureValid) {
      return {
        isValid: false,
        error: "Signature verification failed",
        payload,
      };
    }

    // All checks passed
    return {
      isValid: true,
      payload,
    };
  } catch (error) {
    console.error("[qrUtils] QR code validation error:", error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Validation failed",
    };
  }
}

/**
 * Create a signed QR code payload
 */
export async function createQRCodePayload(
  orderId: string,
  tenantId: string,
  options?: {
    orderNumber?: string;
    expirationHours?: number;
    metadata?: Record<string, any>;
  }
): Promise<QRCodePayload> {
  const timestamp = Date.now();
  const expirationHours = options?.expirationHours || DEFAULT_EXPIRATION_HOURS;
  const expiresAt = timestamp + expirationHours * 60 * 60 * 1000;

  const signature = await generateSignature(
    orderId,
    timestamp,
    tenantId,
    options?.orderNumber
  );

  return {
    orderId,
    orderNumber: options?.orderNumber,
    tenantId,
    timestamp,
    expiresAt,
    signature,
    version: QR_CODE_VERSION,
    metadata: options?.metadata,
  };
}

/**
 * Generate QR code data string (base64 encoded JSON)
 */
export async function generateQRCodeData(
  orderId: string,
  tenantId: string,
  options?: {
    orderNumber?: string;
    expirationHours?: number;
    metadata?: Record<string, any>;
  }
): Promise<string> {
  const payload = await createQRCodePayload(orderId, tenantId, options);
  return encodeBase64Json(payload);
}

/**
 * Check if QR code is expired
 */
export function isQRCodeExpired(payload: QRCodePayload): boolean {
  const now = Date.now();
  
  // Check explicit expiration
  if (payload.expiresAt && now > payload.expiresAt) {
    return true;
  }

  // Check timestamp age (fallback)
  const age = now - payload.timestamp;
  const maxAge = DEFAULT_EXPIRATION_HOURS * 60 * 60 * 1000;
  
  return age > maxAge;
}

/**
 * Validate UUID format
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str.trim());
}

/**
 * Get remaining validity time in milliseconds
 */
export function getRemainingValidity(payload: QRCodePayload): number {
  const now = Date.now();
  
  if (payload.expiresAt) {
    return Math.max(0, payload.expiresAt - now);
  }

  const maxAge = DEFAULT_EXPIRATION_HOURS * 60 * 60 * 1000;
  const age = now - payload.timestamp;
  
  return Math.max(0, maxAge - age);
}

/**
 * Format remaining validity for display
 */
export function formatRemainingValidity(payload: QRCodePayload): string {
  const remainingMs = getRemainingValidity(payload);
  
  if (remainingMs === 0) {
    return "Expired";
  }

  const hours = Math.floor(remainingMs / (60 * 60 * 1000));
  const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  
  return `${minutes}m remaining`;
}

/**
 * Sanitize QR code data for logging (remove sensitive info)
 */
export function sanitizeQRDataForLogging(payload: QRCodePayload): object {
  return {
    orderId: payload.orderId.substring(0, 8) + "...",
    orderNumber: payload.orderNumber || "N/A",
    tenantId: payload.tenantId.substring(0, 8) + "...",
    timestamp: new Date(payload.timestamp).toISOString(),
    expiresAt: payload.expiresAt ? new Date(payload.expiresAt).toISOString() : "N/A",
    version: payload.version || "N/A",
    hasSignature: !!payload.signature,
    signaturePreview: payload.signature.substring(0, 8) + "...",
  };
}