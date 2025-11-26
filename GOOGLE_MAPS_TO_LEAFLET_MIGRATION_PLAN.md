# Google Maps to Leaflet Migration Plan

## Executive Summary

This document provides a comprehensive plan for migrating from Google Maps to Leaflet across the Mobile Order Tracker application. The migration affects the dashboard's tracking, geofences, and public tracking pages. This plan covers not just map visualization, but also geocoding, routing/directions, distance matrix calculations, and real-time tracking features.

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Migration Strategy](#migration-strategy)
3. [Component-by-Component Migration](#component-by-component-migration)
4. [Third-Party Service Replacements](#third-party-service-replacements)
5. [Implementation Phases](#implementation-phases)
6. [Code Changes Required](#code-changes-required)
7. [Testing Strategy](#testing-strategy)
8. [Cost Analysis](#cost-analysis)
9. [Rollback Plan](#rollback-plan)
10. [Timeline and Resources](#timeline-and-resources)

---

## Current State Analysis

### Files Using Google Maps

1. **`dashboard/app/tracking/page.tsx`** (Main Tracking Dashboard)

   - Google Maps visualization with markers and polylines
   - Directions API for planned routes
   - Real-time location updates
   - Route progress calculation
   - ETA calculations

2. **`dashboard/app/tracking/[orderId]/public/page.tsx`** (Public Tracking)

   - Google Maps for public order tracking
   - Directions API for route visualization
   - Distance Matrix API for real-time ETA
   - Traffic-aware distance and duration

3. **`dashboard/app/geofences/page.tsx`** (Geofence Management)
   - Google Maps for geofence visualization
   - Circle markers for geofence boundaries
   - Click-to-place geofence centers
   - Interactive map configuration

### Google Maps Features Currently Used

#### Map Visualization

- `GoogleMap` component
- `Marker` component (loading/unloading points, current vehicle location)
- `Polyline` component (routes - both planned and actual)
- `Circle` component (geofence boundaries)
- Map controls (zoom, type, fullscreen, street view)
- Map click events
- Custom marker icons

#### Services & APIs

- **Directions API**: Calculate planned routes from origin to destination
- **Distance Matrix API**: Calculate real-time distance and duration with traffic
- **Geocoding API**: Convert addresses to coordinates (if used)
- **Static Maps API**: Generate static map images (if used)

#### Advanced Features

- Traffic-aware routing
- Real-time traffic conditions
- Alternative routes
- Waypoints support
- Route optimization

---

## Migration Strategy

### Core Principles

1. **Incremental Migration**: Migrate one page/feature at a time
2. **Feature Parity**: Maintain all existing functionality
3. **Performance Focus**: Ensure Leaflet implementation is performant
4. **Cost Reduction**: Eliminate Google Maps API costs
5. **Open Source**: Use open-source alternatives where possible

### Technology Stack

#### Map Library

- **Leaflet.js** (v1.9+): Core mapping library
- **React-Leaflet** (v4.2+): React wrapper for Leaflet

#### Tile Providers (Choose One or Mix)

- **OpenStreetMap (OSM)**: Free, community-driven, good coverage
- **Mapbox**: Excellent styling, free tier (50K monthly loads)
- **Stadia Maps**: OSM-based, generous free tier
- **Thunderforest**: Specialized themes (transport, outdoors)
- **Maptiler**: Good performance, free tier available

#### Routing & Directions

- **OpenRouteService (ORS)**: Free tier, directions & geocoding
- **OSRM (Open Source Routing Machine)**: Free, fast routing
- **Mapbox Directions API**: Paid, excellent quality
- **GraphHopper**: Open source, self-hostable

#### Geocoding

- **Nominatim (OSM)**: Free, usage policy required
- **OpenCage**: Generous free tier (2,500 req/day)
- **Mapbox Geocoding API**: Paid, excellent accuracy
- **Geoapify**: Free tier (3,000 req/day)

#### Distance Matrix & ETA

- **OpenRouteService Matrix API**: Free tier available
- **OSRM Table Service**: Free, self-hostable
- **Mapbox Matrix API**: Paid
- **Custom calculation**: Use Haversine + speed estimates

---

## Component-by-Component Migration

### 1. Main Tracking Dashboard (`tracking/page.tsx`)

#### Current Google Maps Usage

```typescript
// Components
<LoadScript googleMapsApiKey={apiKey}>
  <GoogleMap
    mapContainerStyle={mapContainerStyle}
    center={mapCenter}
    zoom={mapZoom}
    options={mapOptions}
    onLoad={setMapRef}
  >
    <Marker position={currentPosition} icon={truckIcon} />
    <Marker position={loadingPoint} icon={loadingIcon} />
    <Marker position={unloadingPoint} icon={unloadingIcon} />
    <Polyline path={plannedRoute} options={plannedRouteOptions} />
    <Polyline path={actualRoute} options={actualRouteOptions} />
  </GoogleMap>
</LoadScript>

// Services
const directionsService = new google.maps.DirectionsService();
directionsService.route({...}, callback);
```

#### Leaflet Replacement

```typescript
// Components
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";

<MapContainer
  center={mapCenter}
  zoom={mapZoom}
  style={mapContainerStyle}
  ref={mapRef}
>
  <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  />
  <Marker position={currentPosition} icon={truckIcon} />
  <Marker position={loadingPoint} icon={loadingIcon} />
  <Marker position={unloadingPoint} icon={unloadingIcon} />
  <Polyline positions={plannedRoute} pathOptions={plannedRouteOptions} />
  <Polyline positions={actualRoute} pathOptions={actualRouteOptions} />
</MapContainer>;

// Services - Replace with OpenRouteService
const response = await fetch(
  "https://api.openrouteservice.org/v2/directions/driving-car",
  {
    method: "POST",
    headers: {
      Authorization: ORS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      coordinates: [
        [origin.lng, origin.lat],
        [dest.lng, dest.lat],
      ],
    }),
  }
);
```

#### Migration Steps

1. Install dependencies: `npm install leaflet react-leaflet @types/leaflet`
2. Create custom icons for truck, loading, and unloading points
3. Replace `LoadScript` wrapper with Leaflet initialization
4. Replace Google Maps components with Leaflet equivalents
5. Implement routing service integration (ORS/OSRM)
6. Update route calculation logic
7. Test real-time updates and performance

#### Challenges & Solutions

- **Custom Icons**: Create Leaflet `L.Icon` objects with same imagery
- **Polyline Format**: Google uses `{lat, lng}`, Leaflet uses `[lat, lng]` arrays
- **Map Events**: Replace `onLoad` with Leaflet's `whenReady` or `useMap` hook
- **Bounds Fitting**: Replace `fitBounds()` with Leaflet's `fitBounds()`

### 2. Public Order Tracking (`tracking/[orderId]/public/page.tsx`)

#### Current Google Maps Usage

```typescript
// Distance Matrix for ETA
const distanceMatrixService = new google.maps.DistanceMatrixService();
distanceMatrixService.getDistanceMatrix(
  {
    origins: [currentPosition],
    destinations: [destination],
    travelMode: google.maps.TravelMode.DRIVING,
    drivingOptions: {
      departureTime: new Date(),
      trafficModel: google.maps.TrafficModel.BEST_GUESS,
    },
  },
  callback
);
```

#### Leaflet + ORS Replacement

```typescript
// OpenRouteService for distance/duration with traffic
const response = await fetch(
  "https://api.openrouteservice.org/v2/directions/driving-car",
  {
    method: "POST",
    headers: {
      Authorization: ORS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      coordinates: [
        [origin.lng, origin.lat],
        [dest.lng, dest.lat],
      ],
      extra_info: ["waytype", "steepness"],
      preference: "fastest", // Traffic-aware routing
    }),
  }
);

const duration = response.routes[0].summary.duration; // seconds
const distance = response.routes[0].summary.distance; // meters
```

#### Migration Steps

1. Replace Google Maps visualization (same as tracking page)
2. Replace Distance Matrix API with ORS Directions API
3. Update ETA calculation to use ORS duration data
4. Implement traffic-aware routing with ORS preferences
5. Add fallback for when ORS is unavailable
6. Test real-time updates every 5 minutes

#### Challenges & Solutions

- **Traffic Data**: ORS has limited real-time traffic; consider Mapbox for better traffic
- **Rate Limits**: ORS free tier is 2,000 req/day; implement caching
- **Fallback**: Calculate ETA using Haversine distance + average speed if API fails

### 3. Geofence Management (`geofences/page.tsx`)

#### Current Google Maps Usage

```typescript
<GoogleMap onClick={handleMapClick}>
  {geofences.map((fence) => (
    <Circle
      center={{ lat: fence.latitude, lng: fence.longitude }}
      radius={fence.radius_meters}
      options={circleOptions}
    />
  ))}
</GoogleMap>
```

#### Leaflet Replacement

```typescript
import { Circle as LeafletCircle } from "react-leaflet";

<MapContainer>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  {geofences.map((fence) => (
    <LeafletCircle
      center={[fence.latitude, fence.longitude]}
      radius={fence.radius_meters}
      pathOptions={circleOptions}
    />
  ))}
  <MapClickHandler onClick={handleMapClick} />
</MapContainer>;

// Custom hook for map clicks
function MapClickHandler({ onClick }) {
  const map = useMapEvents({
    click(e) {
      onClick(e.latlng);
    },
  });
  return null;
}
```

#### Migration Steps

1. Replace Google Maps with Leaflet MapContainer
2. Replace Circle components with Leaflet Circle
3. Implement click handler using `useMapEvents`
4. Update coordinate format from `{lat, lng}` to `[lat, lng]`
5. Test geofence creation and visualization

---

## Third-Party Service Replacements

### Directions API Replacement

#### Option 1: OpenRouteService (Recommended for Free Tier)

- **Cost**: Free up to 2,000 requests/day
- **Features**: Car, bike, pedestrian routing; alternatives; waypoints
- **Traffic**: Limited real-time traffic
- **Setup**: Sign up at https://openrouteservice.org/

```typescript
class OpenRouteServiceDirections {
  private apiKey: string;
  private baseUrl = "https://api.openrouteservice.org/v2/directions";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    profile: "driving-car" | "cycling-regular" | "foot-walking" = "driving-car"
  ) {
    const response = await fetch(`${this.baseUrl}/${profile}`, {
      method: "POST",
      headers: {
        Authorization: this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [
          [origin.lng, origin.lat],
          [destination.lng, destination.lat],
        ],
        format: "geojson",
        instructions: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`ORS API error: ${response.statusText}`);
    }

    const data = await response.json();
    const coords = data.features[0].geometry.coordinates;

    // Convert from [lng, lat] to [lat, lng] for Leaflet
    return coords.map(([lng, lat]: [number, number]) => [lat, lng]);
  }
}
```

#### Option 2: OSRM (Best for Self-Hosting)

- **Cost**: Free (self-hosted) or use demo server
- **Features**: Fast routing, table service for distance matrix
- **Traffic**: No real-time traffic
- **Setup**: Use demo server or host your own

```typescript
class OSRMDirections {
  private baseUrl = "https://router.project-osrm.org";

  async getRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ) {
    const url = `${this.baseUrl}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== "Ok") {
      throw new Error(`OSRM error: ${data.message}`);
    }

    const coords = data.routes[0].geometry.coordinates;
    return coords.map(([lng, lat]: [number, number]) => [lat, lng]);
  }
}
```

#### Option 3: Mapbox Directions (Best Quality, Paid)

- **Cost**: $5.00 per 1,000 requests after free tier
- **Features**: Excellent routing, real-time traffic, turn-by-turn
- **Traffic**: Best real-time traffic data
- **Setup**: Sign up at https://www.mapbox.com/

```typescript
class MapboxDirections {
  private accessToken: string;
  private baseUrl = "https://api.mapbox.com/directions/v5/mapbox";

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ) {
    const url = `${this.baseUrl}/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&access_token=${this.accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    const coords = data.routes[0].geometry.coordinates;
    return coords.map(([lng, lat]: [number, number]) => [lat, lng]);
  }
}
```

### Distance Matrix Replacement

#### Option 1: OpenRouteService Matrix

```typescript
async function getDistanceMatrix(
  origins: Array<{ lat: number; lng: number }>,
  destinations: Array<{ lat: number; lng: number }>
) {
  const response = await fetch(
    "https://api.openrouteservice.org/v2/matrix/driving-car",
    {
      method: "POST",
      headers: {
        Authorization: ORS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locations: [
          ...origins.map((o) => [o.lng, o.lat]),
          ...destinations.map((d) => [d.lng, d.lat]),
        ],
        sources: [0], // First location is source
        destinations: [1], // Second location is destination
        metrics: ["distance", "duration"],
      }),
    }
  );

  const data = await response.json();
  return {
    distance: data.distances[0][0], // meters
    duration: data.durations[0][0], // seconds
  };
}
```

#### Option 2: OSRM Table Service

```typescript
async function getDistanceMatrix(
  origins: Array<{ lat: number; lng: number }>,
  destinations: Array<{ lat: number; lng: number }>
) {
  const coords = [
    `${origins[0].lng},${origins[0].lat}`,
    `${destinations[0].lng},${destinations[0].lat}`,
  ].join(";");

  const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&destinations=1`;

  const response = await fetch(url);
  const data = await response.json();

  return {
    distance: data.distances[0][0], // meters (if available)
    duration: data.durations[0][0], // seconds
  };
}
```

#### Option 3: Haversine Distance (Fallback)

```typescript
function haversineDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.lat * Math.PI) / 180;
  const φ2 = (point2.lat * Math.PI) / 180;
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
  const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

function estimateETA(
  current: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  averageSpeedKmh: number = 60
): { distanceMeters: number; durationSeconds: number } {
  const distance = haversineDistance(current, destination);
  const durationSeconds = (distance / 1000 / averageSpeedKmh) * 3600;

  return { distanceMeters: distance, durationSeconds };
}
```

### Geocoding Replacement

#### Option 1: Nominatim (OpenStreetMap)

```typescript
async function geocodeAddress(address: string) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      address
    )}`,
    {
      headers: {
        "User-Agent": "MobileOrderTracker/1.0", // Required by usage policy
      },
    }
  );

  const data = await response.json();
  if (data.length === 0) return null;

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}

async function reverseGeocode(lat: number, lng: number) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
    {
      headers: {
        "User-Agent": "MobileOrderTracker/1.0",
      },
    }
  );

  const data = await response.json();
  return data.display_name;
}
```

#### Option 2: OpenCage

```typescript
async function geocodeAddress(address: string, apiKey: string) {
  const response = await fetch(
    `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
      address
    )}&key=${apiKey}`
  );

  const data = await response.json();
  if (data.results.length === 0) return null;

  return {
    lat: data.results[0].geometry.lat,
    lng: data.results[0].geometry.lng,
    displayName: data.results[0].formatted,
  };
}
```

---

## Implementation Phases

### Phase 1: Setup & Preparation (Week 1)

#### Tasks

1. **Environment Setup**

   - Sign up for OpenRouteService API key
   - (Optional) Sign up for Mapbox API key
   - Install Leaflet dependencies
   - Configure environment variables

2. **Create Utility Libraries**

   - Create `lib/leaflet/directions.ts` for routing
   - Create `lib/leaflet/geocoding.ts` for geocoding
   - Create `lib/leaflet/icons.ts` for custom markers
   - Create `lib/leaflet/utils.ts` for coordinate conversion

3. **Component Preparation**
   - Create reusable Leaflet map wrapper component
   - Create custom hooks (`useLeafletMap`, `useDirections`)
   - Set up TypeScript types for Leaflet

#### Deliverables

- All dependencies installed
- API keys configured
- Utility libraries created
- Reusable components ready

### Phase 2: Geofences Page Migration (Week 2)

#### Tasks

1. Replace Google Maps with Leaflet in `geofences/page.tsx`
2. Implement circle markers for geofence boundaries
3. Implement map click handler for placing geofences
4. Test geofence creation, editing, deletion
5. Verify map controls work correctly

#### Testing

- Create new geofence by clicking map
- Verify circles render at correct locations
- Test zoom and pan functionality
- Test on mobile and desktop

#### Deliverables

- Fully functional geofences page with Leaflet
- No Google Maps dependencies in geofences page

### Phase 3: Main Tracking Dashboard Migration (Week 3-4)

#### Tasks

1. Replace Google Maps visualization in `tracking/page.tsx`
2. Integrate OpenRouteService for planned routes
3. Update route progress calculations
4. Implement real-time location updates with Leaflet
5. Create custom icons for trucks, loading, unloading points
6. Test with multiple active orders

#### Testing

- Test real-time location updates
- Verify planned routes match Google Maps routes
- Test route progress calculations
- Test with 5+ simultaneous active orders
- Performance testing

#### Deliverables

- Fully functional tracking dashboard with Leaflet
- Route calculations working correctly
- Real-time updates working

### Phase 4: Public Tracking Migration (Week 5)

#### Tasks

1. Replace Google Maps in `tracking/[orderId]/public/page.tsx`
2. Integrate OpenRouteService or Mapbox for distance matrix
3. Update ETA calculations
4. Test traffic-aware routing (if using Mapbox)
5. Implement fallback to Haversine distance

#### Testing

- Test public tracking link with real orders
- Verify ETA accuracy compared to Google Maps
- Test every 5-minute refresh cycle
- Test with various distances and routes

#### Deliverables

- Fully functional public tracking page
- Accurate ETA calculations
- No Google Maps dependencies

### Phase 5: Testing & Optimization (Week 6)

#### Tasks

1. End-to-end testing of all pages
2. Performance optimization (caching, lazy loading)
3. Rate limit handling for ORS/Mapbox
4. Error handling and fallbacks
5. Mobile responsiveness testing
6. Cross-browser testing

#### Testing

- Full regression testing
- Load testing with concurrent users
- Mobile device testing (iOS, Android)
- Browser testing (Chrome, Safari, Firefox, Edge)

#### Deliverables

- All tests passing
- Performance optimized
- Production-ready code

### Phase 6: Deployment & Monitoring (Week 7)

#### Tasks

1. Remove Google Maps API key from environment
2. Deploy to staging environment
3. Monitor API usage and costs
4. Set up error monitoring for new services
5. Deploy to production
6. Monitor for issues

#### Deliverables

- Deployed to production
- Google Maps completely removed
- Monitoring in place

---

## Code Changes Required

### 1. New Dependencies

```json
// package.json additions
{
  "dependencies": {
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1",
    "@types/leaflet": "^1.9.8"
  }
}
```

### 2. New Utility Files

#### `lib/leaflet/icons.ts`

```typescript
import L from "leaflet";

export const truckIcon = new L.Icon({
  iconUrl: "/icons/truck-marker.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

export const loadingIcon = new L.Icon({
  iconUrl: "/icons/loading-marker.png",
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

export const unloadingIcon = new L.Icon({
  iconUrl: "/icons/unloading-marker.png",
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

// Fix for default marker icons not showing
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});
```

#### `lib/leaflet/directions.ts`

```typescript
interface RoutePoint {
  lat: number;
  lng: number;
}

interface RouteResult {
  path: [number, number][];
  distance: number; // meters
  duration: number; // seconds
}

export class DirectionsService {
  private apiKey: string;
  private provider: "ors" | "osrm" | "mapbox";

  constructor(apiKey: string, provider: "ors" | "osrm" | "mapbox" = "ors") {
    this.apiKey = apiKey;
    this.provider = provider;
  }

  async getRoute(
    origin: RoutePoint,
    destination: RoutePoint
  ): Promise<RouteResult> {
    switch (this.provider) {
      case "ors":
        return this.getOrsRoute(origin, destination);
      case "osrm":
        return this.getOsrmRoute(origin, destination);
      case "mapbox":
        return this.getMapboxRoute(origin, destination);
      default:
        throw new Error(`Unknown provider: ${this.provider}`);
    }
  }

  private async getOrsRoute(
    origin: RoutePoint,
    destination: RoutePoint
  ): Promise<RouteResult> {
    const response = await fetch(
      "https://api.openrouteservice.org/v2/directions/driving-car",
      {
        method: "POST",
        headers: {
          Authorization: this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinates: [
            [origin.lng, origin.lat],
            [destination.lng, destination.lat],
          ],
          format: "geojson",
          instructions: false,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ORS API error: ${response.statusText}`);
    }

    const data = await response.json();
    const route = data.features[0];
    const coords = route.geometry.coordinates;

    return {
      path: coords.map(([lng, lat]: [number, number]) => [lat, lng]),
      distance: route.properties.summary.distance,
      duration: route.properties.summary.duration,
    };
  }

  private async getOsrmRoute(
    origin: RoutePoint,
    destination: RoutePoint
  ): Promise<RouteResult> {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== "Ok") {
      throw new Error(`OSRM error: ${data.message}`);
    }

    const route = data.routes[0];
    const coords = route.geometry.coordinates;

    return {
      path: coords.map(([lng, lat]: [number, number]) => [lat, lng]),
      distance: route.distance,
      duration: route.duration,
    };
  }

  private async getMapboxRoute(
    origin: RoutePoint,
    destination: RoutePoint
  ): Promise<RouteResult> {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&access_token=${this.apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    const route = data.routes[0];
    const coords = route.geometry.coordinates;

    return {
      path: coords.map(([lng, lat]: [number, number]) => [lat, lng]),
      distance: route.distance,
      duration: route.duration,
    };
  }
}
```

#### `lib/leaflet/distance-matrix.ts`

```typescript
interface MatrixPoint {
  lat: number;
  lng: number;
}

interface MatrixResult {
  distance: number; // meters
  duration: number; // seconds
}

export class DistanceMatrixService {
  private apiKey: string;
  private provider: "ors" | "osrm" | "haversine";

  constructor(apiKey: string, provider: "ors" | "osrm" | "haversine" = "ors") {
    this.apiKey = apiKey;
    this.provider = provider;
  }

  async getDistance(
    origin: MatrixPoint,
    destination: MatrixPoint
  ): Promise<MatrixResult> {
    switch (this.provider) {
      case "ors":
        return this.getOrsDistance(origin, destination);
      case "osrm":
        return this.getOsrmDistance(origin, destination);
      case "haversine":
        return this.getHaversineDistance(origin, destination);
      default:
        throw new Error(`Unknown provider: ${this.provider}`);
    }
  }

  private async getOrsDistance(
    origin: MatrixPoint,
    destination: MatrixPoint
  ): Promise<MatrixResult> {
    const response = await fetch(
      "https://api.openrouteservice.org/v2/matrix/driving-car",
      {
        method: "POST",
        headers: {
          Authorization: this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locations: [
            [origin.lng, origin.lat],
            [destination.lng, destination.lat],
          ],
          sources: [0],
          destinations: [1],
          metrics: ["distance", "duration"],
        }),
      }
    );

    if (!response.ok) {
      // Fallback to haversine on error
      console.warn("ORS Matrix API error, falling back to haversine");
      return this.getHaversineDistance(origin, destination);
    }

    const data = await response.json();
    return {
      distance: data.distances[0][0],
      duration: data.durations[0][0],
    };
  }

  private async getOsrmDistance(
    origin: MatrixPoint,
    destination: MatrixPoint
  ): Promise<MatrixResult> {
    const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&destinations=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== "Ok") {
      console.warn("OSRM Table API error, falling back to haversine");
      return this.getHaversineDistance(origin, destination);
    }

    // OSRM doesn't return distance in table service, so calculate it
    const duration = data.durations[0][0];
    const averageSpeedMps = 16.67; // ~60 km/h
    const distance = duration * averageSpeedMps;

    return { distance, duration };
  }

  private getHaversineDistance(
    origin: MatrixPoint,
    destination: MatrixPoint
  ): Promise<MatrixResult> {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (origin.lat * Math.PI) / 180;
    const φ2 = (destination.lat * Math.PI) / 180;
    const Δφ = ((destination.lat - origin.lat) * Math.PI) / 180;
    const Δλ = ((destination.lng - origin.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in meters
    const averageSpeedKmh = 60;
    const duration = (distance / 1000 / averageSpeedKmh) * 3600;

    return Promise.resolve({ distance, duration });
  }
}
```

#### `lib/leaflet/geocoding.ts`

```typescript
interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
}

export class GeocodingService {
  private apiKey?: string;
  private provider: "nominatim" | "opencage";

  constructor(
    provider: "nominatim" | "opencage" = "nominatim",
    apiKey?: string
  ) {
    this.provider = provider;
    this.apiKey = apiKey;
  }

  async geocode(address: string): Promise<GeocodingResult | null> {
    if (this.provider === "nominatim") {
      return this.geocodeNominatim(address);
    } else {
      return this.geocodeOpenCage(address);
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    if (this.provider === "nominatim") {
      return this.reverseGeocodeNominatim(lat, lng);
    } else {
      return this.reverseGeocodeOpenCage(lat, lng);
    }
  }

  private async geocodeNominatim(
    address: string
  ): Promise<GeocodingResult | null> {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        address
      )}`,
      {
        headers: {
          "User-Agent": "MobileOrderTracker/1.0",
        },
      }
    );

    const data = await response.json();
    if (data.length === 0) return null;

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  }

  private async reverseGeocodeNominatim(
    lat: number,
    lng: number
  ): Promise<string | null> {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: {
          "User-Agent": "MobileOrderTracker/1.0",
        },
      }
    );

    const data = await response.json();
    return data.display_name || null;
  }

  private async geocodeOpenCage(
    address: string
  ): Promise<GeocodingResult | null> {
    if (!this.apiKey) {
      throw new Error("OpenCage API key required");
    }

    const response = await fetch(
      `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
        address
      )}&key=${this.apiKey}`
    );

    const data = await response.json();
    if (data.results.length === 0) return null;

    return {
      lat: data.results[0].geometry.lat,
      lng: data.results[0].geometry.lng,
      displayName: data.results[0].formatted,
    };
  }

  private async reverseGeocodeOpenCage(
    lat: number,
    lng: number
  ): Promise<string | null> {
    if (!this.apiKey) {
      throw new Error("OpenCage API key required");
    }

    const response = await fetch(
      `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${this.apiKey}`
    );

    const data = await response.json();
    return data.results[0]?.formatted || null;
  }
}
```

### 3. Environment Variables

```bash
# .env.local additions
NEXT_PUBLIC_ORS_API_KEY=your_openrouteservice_key
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token (optional)
NEXT_PUBLIC_OPENCAGE_API_KEY=your_opencage_key (optional)
NEXT_PUBLIC_MAP_TILE_PROVIDER=osm # osm, mapbox, stadia, etc.
```

### 4. Update Existing Files

#### Changes to `tracking/page.tsx`

- Remove Google Maps imports
- Add Leaflet imports
- Replace `LoadScript` with Leaflet setup
- Replace `GoogleMap` with `MapContainer`
- Replace `Marker` with Leaflet `Marker`
- Replace `Polyline` with Leaflet `Polyline`
- Update `directionsServiceRef` to use new `DirectionsService` class
- Update coordinate format from `{lat, lng}` to `[lat, lng]`

#### Changes to `tracking/[orderId]/public/page.tsx`

- Same map component changes as above
- Replace `DistanceMatrixService` with new utility class
- Update ETA calculation to use new service
- Add fallback to Haversine distance

#### Changes to `geofences/page.tsx`

- Replace Google Maps components with Leaflet
- Update `Circle` component usage
- Implement map click handler with `useMapEvents`

### 5. CSS Changes

```css
/* globals.css or similar */

/* Import Leaflet CSS */
@import "leaflet/dist/leaflet.css";

/* Fix for marker icons not showing */
.leaflet-container {
  width: 100%;
  height: 100%;
}

/* Ensure popups are styled */
.leaflet-popup-content-wrapper {
  border-radius: 8px;
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// __tests__/lib/leaflet/directions.test.ts
import { DirectionsService } from "@/lib/leaflet/directions";

describe("DirectionsService", () => {
  it("should get route from ORS", async () => {
    const service = new DirectionsService("test-key", "ors");
    const route = await service.getRoute(
      { lat: -25.7479, lng: 28.2293 },
      { lat: -26.2041, lng: 28.0473 }
    );

    expect(route.path).toBeDefined();
    expect(route.path.length).toBeGreaterThan(0);
    expect(route.distance).toBeGreaterThan(0);
    expect(route.duration).toBeGreaterThan(0);
  });

  it("should handle invalid coordinates", async () => {
    const service = new DirectionsService("test-key", "ors");
    await expect(
      service.getRoute({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })
    ).rejects.toThrow();
  });
});
```

### Integration Tests

```typescript
// __tests__/tracking/page.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import TrackingPage from "@/app/tracking/page";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() =>
        Promise.resolve({ data: { session: mockSession } })
      ),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: mockOrders, error: null })),
      })),
    })),
  },
}));

describe("TrackingPage with Leaflet", () => {
  it("should render map with markers", async () => {
    render(<TrackingPage />);

    await waitFor(() => {
      expect(screen.getByText("Live Tracking")).toBeInTheDocument();
    });

    // Check that Leaflet map container exists
    const mapContainer = document.querySelector(".leaflet-container");
    expect(mapContainer).toBeInTheDocument();
  });
});
```

### Manual Testing Checklist

#### Geofences Page

- [ ] Map loads correctly
- [ ] Existing geofences display as circles
- [ ] Click on map to place new geofence
- [ ] Create geofence saves correctly
- [ ] Circles have correct radius
- [ ] Map controls (zoom, type) work
- [ ] Mobile responsive

#### Tracking Dashboard

- [ ] Map loads with all active orders
- [ ] Vehicle markers show at correct locations
- [ ] Planned routes display correctly
- [ ] Actual routes display correctly
- [ ] Real-time location updates work
- [ ] Route progress calculation accurate
- [ ] Selecting order highlights route
- [ ] Multiple orders display correctly
- [ ] Performance with 10+ orders

#### Public Tracking

- [ ] Public link loads map
- [ ] Current vehicle location shown
- [ ] Planned route displayed
- [ ] ETA calculation accurate
- [ ] ETA updates every 5 minutes
- [ ] Distance/duration shown correctly
- [ ] Works on mobile devices
- [ ] Works without authentication

### Performance Testing

```typescript
// Test with many markers
async function testManyMarkers() {
  const markers = [];
  for (let i = 0; i < 100; i++) {
    markers.push({
      lat: -25.7479 + Math.random() * 2,
      lng: 28.2293 + Math.random() * 2,
    });
  }

  const startTime = performance.now();
  // Render map with all markers
  const endTime = performance.now();

  console.log(`Rendered ${markers.length} markers in ${endTime - startTime}ms`);
  expect(endTime - startTime).toBeLessThan(1000); // Should be under 1 second
}
```

---

## Cost Analysis

### Current State (Google Maps)

#### Google Maps Platform Pricing

- **Maps JavaScript API**: $7.00 per 1,000 loads
- **Directions API**: $5.00 per 1,000 requests
- **Distance Matrix API**: $5.00 per 1,000 requests (basic), $10.00 (advanced)
- **Geocoding API**: $5.00 per 1,000 requests
- **Free tier**: $200 credit per month

#### Estimated Monthly Usage

- Map loads: 10,000 (dashboard + public tracking)
- Directions API: 5,000 (route calculations)
- Distance Matrix API: 8,000 (ETA updates every 5 min)
- Geocoding: 1,000

#### Monthly Cost Estimate

- Maps: 10,000 × $7 / 1,000 = $70.00
- Directions: 5,000 × $5 / 1,000 = $25.00
- Distance Matrix: 8,000 × $5 / 1,000 = $40.00
- Geocoding: 1,000 × $5 / 1,000 = $5.00
- **Total**: $140.00/month
- **After $200 credit**: $0 (if under credit), or $140/month

### Future State (Leaflet + Open Services)

#### Option 1: Free Open Source Stack

- **Leaflet**: Free
- **OpenStreetMap Tiles**: Free
- **OpenRouteService**: Free (up to 2,000 req/day = 60,000/month)
- **Nominatim Geocoding**: Free (with usage policy)
- **Total**: $0/month

#### Option 2: Mixed Stack (Quality + Cost Balance)

- **Leaflet**: Free
- **Mapbox Tiles**: $5.00 per 1,000 loads after 50,000 free
- **Mapbox Directions**: $5.00 per 1,000 requests after 100,000 free
- **OpenCage Geocoding**: Free (2,500 req/day)
- **Total**: ~$15-30/month (depending on usage)

#### Option 3: Premium Stack (Best Quality)

- **Leaflet**: Free
- **Mapbox Tiles**: $5.00 per 1,000 loads
- **Mapbox Directions**: $5.00 per 1,000 requests
- **Mapbox Matrix**: $10.00 per 1,000 requests
- **Mapbox Geocoding**: $5.00 per 1,000 requests
- **Total**: ~$80-100/month

### Cost Savings

| Scenario | Current (Google) | Future (Leaflet) | Savings    |
| -------- | ---------------- | ---------------- | ---------- |
| Free OSS | $140/month       | $0/month         | $140/month |
| Mixed    | $140/month       | $20/month        | $120/month |
| Premium  | $140/month       | $90/month        | $50/month  |

**Annual Savings**: $600 - $1,680

---

## Rollback Plan

### Pre-Migration Backup

1. **Create feature branch**: `feature/leaflet-migration`
2. **Tag current state**: `git tag pre-leaflet-migration`
3. **Document current API keys**: Save all Google Maps keys
4. **Backup environment variables**: Keep `.env.local` backup

### Rollback Steps

If migration fails or has critical issues:

1. **Revert code changes**:

   ```bash
   git checkout main
   git revert <commit-range>
   ```

2. **Restore Google Maps API key**:

   ```bash
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<original-key>
   ```

3. **Redeploy previous version**:

   ```bash
   vercel --prod
   ```

4. **Monitor for stability**: Check all map features work

### Partial Rollback

If only one component has issues, can roll back incrementally:

```typescript
// Create feature flag in environment
const USE_LEAFLET = process.env.NEXT_PUBLIC_USE_LEAFLET === "true";

// In component
{
  USE_LEAFLET ? <LeafletMap {...props} /> : <GoogleMap {...props} />;
}
```

This allows rolling back specific pages while keeping others on Leaflet.

---

## Timeline and Resources

### Timeline (7 weeks)

| Week | Phase     | Tasks                                        | Deliverables        |
| ---- | --------- | -------------------------------------------- | ------------------- |
| 1    | Setup     | Install deps, create utilities, get API keys | Utilities ready     |
| 2    | Geofences | Migrate geofences page                       | Working geofences   |
| 3-4  | Tracking  | Migrate tracking dashboard                   | Working dashboard   |
| 5    | Public    | Migrate public tracking                      | Working public page |
| 6    | Testing   | Full testing, optimization                   | All tests pass      |
| 7    | Deploy    | Deploy and monitor                           | Production live     |

### Resources Required

#### Development

- **1 Full-Stack Developer**: 7 weeks, 30-40 hours/week
- **Skills needed**: React, TypeScript, Leaflet, mapping APIs

#### API Keys & Services

- OpenRouteService account (free tier)
- (Optional) Mapbox account for premium features
- (Optional) OpenCage for geocoding

#### Testing

- Multiple devices for mobile testing
- Browser testing tools (BrowserStack or similar)

### Risk Mitigation

| Risk                    | Impact | Probability | Mitigation                            |
| ----------------------- | ------ | ----------- | ------------------------------------- |
| ORS rate limits         | High   | Medium      | Implement caching, fallback to OSRM   |
| Route quality issues    | Medium | Low         | Test extensively, consider Mapbox     |
| Performance degradation | High   | Low         | Optimize with markers clustering      |
| Browser compatibility   | Medium | Low         | Test all major browsers               |
| Developer availability  | High   | Medium      | Document thoroughly, pair programming |

---

## Recommendations

### Recommended Stack

For this application, I recommend:

1. **Map Tiles**: OpenStreetMap (free) or Mapbox (better quality, still affordable)
2. **Routing**: OpenRouteService for most routes, with Haversine fallback
3. **Distance Matrix**: OpenRouteService Matrix API with Haversine fallback
4. **Geocoding**: Nominatim (free, OSM-based) or OpenCage (generous free tier)

### Why This Stack?

- **Cost-effective**: Total cost $0-20/month vs $140/month
- **Reliable**: Open source, community-supported
- **Good enough**: Quality sufficient for most use cases
- **Fallback options**: Multiple layers of redundancy

### When to Consider Premium (Mapbox)

Consider upgrading to Mapbox if:

- Need real-time traffic data
- Require turn-by-turn navigation
- Need highest quality route calculations
- Budget allows for $80-100/month

### Next Steps

1. **Get stakeholder approval** for migration plan
2. **Sign up for OpenRouteService** and get API key
3. **Start Phase 1**: Setup and preparation
4. **Weekly progress reviews** with stakeholders
5. **Deploy incrementally**: One page at a time

---

## Appendix

### Useful Resources

- **Leaflet Documentation**: https://leafletjs.com/
- **React-Leaflet**: https://react-leaflet.js.org/
- **OpenRouteService**: https://openrouteservice.org/
- **OSRM**: http://project-osrm.org/
- **Mapbox**: https://www.mapbox.com/
- **Nominatim**: https://nominatim.org/
- **OpenCage**: https://opencagedata.com/

### Sample Projects

- **Leaflet + React**: https://github.com/Leaflet/Leaflet
- **React-Leaflet Examples**: https://react-leaflet.js.org/docs/start-introduction/
- **ORS Examples**: https://openrouteservice.org/dev/#/api-docs

### Support & Community

- **Stack Overflow**: Tags `leaflet`, `react-leaflet`
- **GitHub Issues**: For library-specific issues
- **Leaflet Slack**: Community support channel

---

## Conclusion

Migrating from Google Maps to Leaflet is a substantial but achievable project that can save **$600-1,680 annually** while maintaining or improving functionality. The 7-week timeline provides adequate time for thorough testing and optimization. With proper planning and the recommended open-source stack, this migration will result in a more cost-effective and flexible mapping solution for the Mobile Order Tracker application.

The key to success is:

1. **Incremental approach**: Migrate one page at a time
2. **Thorough testing**: Test each component before moving to the next
3. **Multiple fallbacks**: Always have a Plan B (Haversine distance, OSRM, etc.)
4. **Good documentation**: Document decisions and code thoroughly

With this plan, the migration can be executed with minimal risk and maximum benefit to the application.
