// src/utils/qrUtils.ts
import * as Crypto from "expo-crypto";

/**
 * QR Code payload interface
 */
export interface QRCodePayload {
  orderId: string;
  tenantId: string;
  timestamp: number;
  signature: string;
  version?: string;
}

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

    // Buffer is polyfilled in RN via metro runtime; avoid atob/btoa
    const buffer = Buffer.from(padded, "base64");
    return new TextDecoder("utf-8").decode(buffer);
  } catch (error) {
    console.warn("Base64 decode failed:", error);
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
    console.warn("Base64 encode failed:", error);
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
    console.warn("Base64 JSON decode failed:", error);
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
    console.warn("Base64 JSON encode failed:", error);
    return "";
  }
}

/**
 * Parse QR code data to extract payload (JSON or base64 only; no deep links)
 */
export function parseQRCodeData(qrData: string): QRCodePayload | null {
  try {
    if (!qrData || typeof qrData !== "string") return null;

    // Try direct JSON parse first
    try {
      const payload = JSON.parse(qrData) as QRCodePayload;
      if (payload.orderId && payload.tenantId && payload.signature) {
        return payload;
      }
    } catch {
      // Not direct JSON, fall back to base64
    }

    // Try base64 JSON decode
    const decoded = decodeBase64Json<QRCodePayload>(qrData);
    if (decoded && decoded.orderId && decoded.tenantId && decoded.signature) {
      return decoded;
    }

    return null;
  } catch (error) {
    console.warn("QR code data parse failed:", error);
    return null;
  }
}

/**
 * Verify QR code signature with enhanced security
 */
export async function verifySignature(payload: QRCodePayload): Promise<boolean> {
  try {
    // Basic payload validation
    if (!payload?.orderId || !payload?.tenantId || !payload?.signature || !payload.timestamp) {
      return false;
    }

    // Timestamp freshness check: allow 10 minutes
    const now = Date.now();
    const maxSkewMs = 10 * 60 * 1000;
    if (Math.abs(now - payload.timestamp) > maxSkewMs) {
      console.warn("QR signature stale or timestamp skew too large");
      return false; // Fail in strict mode
    }

    const secret = process.env.EXPO_PUBLIC_QR_CODE_SECRET;
    if (!secret) {
      if (__DEV__) {
        console.warn("QR code secret not set; skipping verification (dev mode)");
        return true;
      }
      // In production without secret, fail closed
      return false;
    }

    const message = `${payload.orderId}.${payload.timestamp}.${payload.tenantId}`;
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      message + secret
    );

    return digest === payload.signature;
  } catch (error) {
    console.warn("QR signature verification failed:", error);
    return false;
  }
}