// /workspaces/MobileOrderTracker/shared/utils.ts
// General shared utilities for order handling and formatting

import { parsePostGISPoint } from "./locationUtils";
import type { Location, Order, OrderStatus, TrackingUpdate } from './types';


/**
 * Format order status for display (e.g., "in_transit" -> "In Transit")
 */
export const formatOrderStatus = (status: OrderStatus): string => {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Get order location (defaults to destination)
 */
export const getOrderLocation = (order: Order): Location | null => {
  // Try PostGIS format first if available
  if (order.unloading_point_location) {
    try {
      return parsePostGISPoint(order.unloading_point_location);
    } catch (e) {
      // Fall back to legacy fields
    }
  }

  // Fall back to legacy lat/lng fields
  if (order.destination_lat !== null && order.destination_lng !== null && 
      order.destination_lat !== undefined && order.destination_lng !== undefined) {
    return {
      latitude: order.destination_lat,
      longitude: order.destination_lng,
    };
  }
  return null;
};

/**
 * Get latest tracking update
 */
export const getLatestTrackingUpdate = (
  updates: TrackingUpdate[]
): TrackingUpdate | null => {
  if (!updates.length) return null;

  return updates.reduce((latest, update) =>
    new Date(update.created_at) > new Date(latest.created_at) ? update : latest
  );
};

/**
 * Check if order is active
 */
export const isOrderActive = (order: Order): boolean => {
  const activeStatuses: OrderStatus[] = ["assigned", "in_transit"];
  return activeStatuses.includes(order.status);
};

/**
 * Check if driver can update order
 */
export const canDriverUpdateOrder = (
  order: Order,
  driverId: string
): boolean => {
  return order.assigned_driver_id === driverId && isOrderActive(order);
};

/**
 * Calculate distance between two points in km
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Format a date for display
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A";

  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch (e) {
    return "Invalid date";
  }
};

/**
 * Calculate estimated time of arrival
 */
export const calculateETA = (
  currentLocation: Location,
  destinationLocation: Location,
  averageSpeedKmh: number = 60
): Date => {
  if (!currentLocation || !destinationLocation) {
    return new Date();
  }

  // Calculate distance
  const distance = calculateDistance(
    currentLocation.latitude,
    currentLocation.longitude,
    destinationLocation.latitude,
    destinationLocation.longitude
  );

  // Calculate time in hours
  const timeHours = distance / averageSpeedKmh;

  // Calculate arrival time
  const now = new Date();
  const arrivalTime = new Date(now.getTime() + timeHours * 60 * 60 * 1000);

  return arrivalTime;
};
