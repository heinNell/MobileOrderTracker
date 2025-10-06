// Utility functions for the dashboard application
import { toast } from "react-hot-toast";

// -----------------------------
// Types
// -----------------------------
type Serializable = Record<string, unknown> | unknown[] | string | number | boolean | null;

// -----------------------------
// Error handling utilities
// -----------------------------
export const handleApiError = (error: unknown, defaultMessage = "An error occurred"): string => {
  console.error("API Error:", error);

  // Extract error message safely
  let message = defaultMessage;

  if (typeof error === "string") {
    message = error;
  } else if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    const maybeError = (error as { error?: unknown }).error;

    if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) {
      message = maybeMessage;
    } else if (typeof maybeError === "string" && maybeError.trim().length > 0) {
      message = maybeError;
    } else {
      try {
        message = JSON.stringify(error);
      } catch {
        // keep default
      }
    }
  }

  // Show error notification
  toast.error(message);

  return message;
};

export const handleSuccess = (message: string): void => {
  toast.success(message);
};

// -----------------------------
// Validation utilities
// -----------------------------
export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validateRequired = (value: string | number | null | undefined): boolean => {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
};

export const validateCoordinates = (lat: number, lng: number): boolean => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

// -----------------------------
// Format utilities
// -----------------------------
export const formatCurrency = (amount: number, currency = "USD"): string => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    // Fallback
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const toValidDate = (input: string | number | Date): Date | null => {
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
};

export const formatDate = (dateInput: string | number | Date): string => {
  const date = toValidDate(dateInput);
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatDateTime = (dateInput: string | number | Date): string => {
  const date = toValidDate(dateInput);
  if (!date) return "";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// -----------------------------
// Local storage utilities (SSR-safe)
// -----------------------------
const hasWindow = typeof window !== "undefined";
const getStorage = (): Storage | null => {
  try {
    return hasWindow ? window.localStorage : null;
  } catch {
    return null;
  }
};

export const setLocalStorage = <T extends Serializable>(key: string, value: T): void => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Error setting localStorage:", error);
  }
};

export const getLocalStorage = <T = unknown>(key: string): T | null => {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const item = storage.getItem(key);
    return item ? (JSON.parse(item) as T) : null;
  } catch (error) {
    console.error("Error getting localStorage:", error);
    return null;
  }
};

export const removeLocalStorage = (key: string): void => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch (error) {
    console.error("Error removing localStorage:", error);
  }
};

// -----------------------------
// Debounce utility
// -----------------------------
/**
 * Debounce a function. The debounced function returns void.
 * Usage:
 *   const onResize = debounce(() => { ... }, 200);
 */
export const debounce = <F extends (...args: any[]) => void>(func: F, wait: number) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const debounced = (...args: Parameters<F>): void => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };

  // Optionally expose a cancel method
  (debounced as any).cancel = () => {
    if (timeout) clearTimeout(timeout);
    timeout = undefined;
  };

  return debounced as F & { cancel?: () => void };
};