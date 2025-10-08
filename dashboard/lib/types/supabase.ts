// Common types for Supabase operations

export interface Location {
  lat: number;
  lng: number;
}

export interface QRCodeResult {
  data: string;
  image: string;
  expiresAt: string;
}

export interface ValidationResult {
  valid: boolean;
  orderId?: string;
  orderData?: any;
}

export interface TaskResult {
  taskId: string;
  status: string;
  result?: any;
}

export interface HandlerResult {
  processed: boolean;
  newState?: string;
  message?: string;
}

export interface SwiftActionResult {
  executed: boolean;
  result?: any;
  message?: string;
}

export interface MapsServiceResult {
  success: boolean;
  data: any;
}

export interface TaskConfig {
  name?: string;
  priority?: number;
  schedule?: string;
  parameters?: any;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
