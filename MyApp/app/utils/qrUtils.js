// src/utils/qrUtils.js
import { useMemo, useCallback } from 'react';

/**
 * Encode to Base64 URL-safe
 */
export function encodeBase64(str) {
  try {
    // Use btoa for base64 encoding
    const base64 = btoa(unescape(encodeURIComponent(str)));
    // Replace '+' and '/' with URL-safe characters and remove padding
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (error) {
    console.error('Base64 encode error:', error);
    return '';
  }
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
    return decodeURIComponent(escape(atob(paddedBase64)));
  } catch (error) {
    console.error('Base64 decode error:', error);
    return null;
  }
}

/**
 * Cross-platform crypto digest function (web-only for now)
 */
async function digestString(algorithm, data) {
  try {
    // Use browser's built-in crypto (removed window. for better compatibility)
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest(algorithm, dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('Digest error:', error);
    return '';
  }
}

/**
 * React hook for QR code utilities
 */
export const useQRCodeUtils = (jsonString, secret) => {
  const encoded = useMemo(() => {
    if (!jsonString) return '';
    try {
      // Handle both string and object inputs
      const stringToEncode = typeof jsonString === 'string' 
        ? jsonString 
        : JSON.stringify(jsonString);
      return encodeBase64(stringToEncode);
    } catch (error) {
      console.error('Encoding failed:', error);
      return '';
    }
  }, [jsonString]);

  const getSignature = useCallback(async () => {
    if (!encoded || !secret) return '';
    try {
      return await digestString('SHA-256', encoded + secret);
    } catch (error) {
      console.error('Signature generation failed:', error);
      return '';
    }
  }, [encoded, secret]);

  const decode = useMemo(() => {
    if (!encoded) return '';
    try {
      const decoded = decodeBase64(encoded);
      if (!decoded) return '';
      
      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(decoded);
      } catch {
        return decoded;
      }
    } catch (error) {
      console.error('Decoding failed:', error);
      return '';
    }
  }, [encoded]);

  return { 
    encoded, 
    getSignature, 
    decode,
    isValid: !!encoded && !!secret
  };
};
