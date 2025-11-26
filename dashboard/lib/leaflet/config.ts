// lib/leaflet-config.ts

import { AdvancedETACalculator } from './advanced-eta';
import { DirectionsService } from './directions';
import { DistanceMatrixService } from './distance-matrix';

export interface LeafletConfig {
  orsApiKey?: string;
  mapboxToken?: string;
  defaultProvider: 'ors' | 'osrm' | 'mapbox';
  tileProvider: 'osm' | 'mapbox' | 'stadia';
  tileUrl?: string;
  attribution?: string;
}

/**
 * Get config from environment with safe fallbacks
 */
export function getLeafletConfig(): LeafletConfig {
  const provider = (process.env.NEXT_PUBLIC_MAP_PROVIDER?.toLowerCase() || 'osrm') as any;
  const tile = (process.env.NEXT_PUBLIC_TILE_PROVIDER?.toLowerCase() || 'osm') as any;

  return {
    orsApiKey: process.env.NEXT_PUBLIC_ORS_API_KEY || undefined,
    mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || undefined,
    defaultProvider: ['ors', 'osrm', 'mapbox'].includes(provider) ? provider : 'osrm',
    tileProvider: ['osm', 'mapbox', 'stadia'].includes(tile) ? tile : 'osm',
  };
}

/**
 * Get tile layer config (with Mapbox fallback to OSM if no token)
 */
export function getTileLayerConfig() {
  const config = getLeafletConfig();

  switch (config.tileProvider) {
    case 'mapbox':
      if (!config.mapboxToken) {
        console.warn('Mapbox token missing → falling back to OSM');
        return {
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        };
      }
      return {
        url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${config.mapboxToken}`,
        attribution: '© Mapbox © OpenStreetMap',
        maxZoom: 22,
        tileSize: 512,
        zoomOffset: -1,
      };

    case 'stadia':
      return {
        url: 'https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png',
        attribution: '© Stadia Maps © OpenStreetMap',
        maxZoom: 20,
      };

    case 'osm':
    default:
      return {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      };
  }
}

/**
 * Initialize all services (call once at app startup)
 */
let services: {
  directions: DirectionsService;
  distanceMatrix: DistanceMatrixService;
  etaCalculator: AdvancedETACalculator;
} | null = null;

export function getLeafletServices() {
  if (services) return services;

  const config = getLeafletConfig();
  const apiKey = config.orsApiKey || config.mapboxToken || '';

  services = {
    directions: new DirectionsService(apiKey, config.defaultProvider),
    distanceMatrix: new DistanceMatrixService(apiKey, config.defaultProvider),
    etaCalculator: new AdvancedETACalculator(),
  };

  return services;
}

/**
 * Reset services (useful for testing)
 */
export function resetLeafletServices() {
  services = null;
}

/**
 * Format helpers
 */
export const formatDistance = (meters: number): string => {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
};

export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export const formatETA = (date: Date): string => {
  const diff = Math.round((date.getTime() - Date.now()) / 60000);
  if (diff < 60) return `${diff} min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

export const getConfidenceColor = (c: 'high' | 'medium' | 'low'): string => ({
  high: '#10b981',
  medium: '#f59e0b',
  low: '#ef4444',
}[c]);

export const getDelayColor = (minutes: number): string => {
  if (minutes <= 0) return '#10b981';
  if (minutes <= 5) return '#84cc16';
  if (minutes <= 15) return '#f59e0b';
  return '#ef4444';
};

export const isValidCoordinate = (p: any): p is { lat: number; lng: number } =>
  p &&
  typeof p.lat === 'number' &&
  typeof p.lng === 'number' &&
  p.lat >= -90 && p.lat <= 90 &&
  p.lng >= -180 && p.lng <= 180 &&
  !(p.lat === 0 && p.lng === 0);

/**
 * Convert between formats
 */
export const toLeaflet = (p: { lat: number; lng: number }): [number, number] => [p.lat, p.lng];
export const fromLeaflet = (p: [number, number]): { lat: number; lng: number } => ({ lat: p[0], lng: p[1] });

/**
 * Calculate map bounds from points
 */
export const calculateBounds = (points: Array<{ lat: number; lng: number }>) => {
  if (points.length === 0) return null;
  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ] as [[number, number], [number, number]];
};