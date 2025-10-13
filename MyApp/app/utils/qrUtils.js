// src/utils/qrUtils.js

/**
 * Cross-platform crypto digest function (web-only for now)
 */
async function digestString(algorithm, data) {
  // Use browser's built-in crypto
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await window.crypto.subtle.digest(algorithm, dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Decode Base64 string with URL-safe character handling
 */
export function decodeBase64(str) {
  try {
    // Replace URL-safe characters
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const paddedBase64 = base64 + padding;
    
    // Decode using atob
    return atob(paddedBase64);
  } catch (error) {
    console.error('Base64 decode error:', error);
    return null;
  }
}

/**
 * Encode to Base64 URL-safe format
 */
export function encodeBase64(str) {
  try {
    const base64 = btoa(str);
    // Make URL-safe
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch (error) {
    console.error('Base64 encode error:', error);
    return null;
  }
}

/**
 * Generate QR code data with signature
 */
export async function generateQRData(orderId, timestamp = Date.now()) {
  const data = {
    orderId,
    timestamp,
    type: 'order_pickup'
  };
  
  const jsonString = JSON.stringify(data);
  const encoded = encodeBase64(jsonString);
  
  // Generate signature
  const secret = process.env.EXPO_PUBLIC_QR_SECRET || 'default-secret';
  const signature = await digestString('SHA-256', encoded + secret);
  
  return `${encoded}.${signature.substring(0, 16)}`;
}

/**
 * Verify and parse QR code data
 */
export async function verifyQRData(qrString) {
  try {
    const [encoded, signature] = qrString.split('.');
    
    if (!encoded || !signature) {
      return { valid: false, error: 'Invalid QR format' };
    }
    
    // Verify signature
    const secret = process.env.EXPO_PUBLIC_QR_SECRET || 'default-secret';
    const expectedSignature = await digestString('SHA-256', encoded + secret);
    
    if (!expectedSignature.startsWith(signature)) {
      return { valid: false, error: 'Invalid signature' };
    }
    
    // Decode data
    const decoded = decodeBase64(encoded);
    const data = JSON.parse(decoded);
    
    // Check timestamp (valid for 5 minutes)
    const now = Date.now();
    const age = now - data.timestamp;
    if (age > 5 * 60 * 1000) {
      return { valid: false, error: 'QR code expired' };
    }
    
    return { valid: true, data };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Default export for expo-router compatibility (this should not be used as a route)
export default function NotARoute() {
  return null; // This prevents the file from being used as a route
}
