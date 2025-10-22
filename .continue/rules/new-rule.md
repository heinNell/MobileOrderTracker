# Rules for the Full-Stack Application Development of a Logistics Mobile App and Dashboard

## Rules for Application Development

### QR Code Generation Rule
Each order must automatically generate a unique QR code upon creation in the centralized dashboard using Supabase Edge Functions.  
QR codes must be easily accessible for drivers through physical or electronic documentation, with download functionality in the dashboard.

### Dashboard Management Rule
The centralized dashboard, built with Next.js 14 and TypeScript, shall serve as the main interface for managing all order-related data.  
It must allow administrators to monitor, update, and analyze transportation activities in real time, including features like order management, live tracking, incident management, communication hub, driver management, analytics & reporting, and geofence management.

### Mobile App Functionality Rule
Drivers must be able to scan QR codes using native camera integration in the React Native Expo app to access detailed order information.  
The app shall integrate Google Maps via `react-native-maps` for optimized navigation, real-time tracking of vehicle locations, turn-by-turn directions, and geofencing support, with web compatibility using `@react-google-maps/api` for the PWA version.

### Real-Time Communication Rule
The app must facilitate seamless communication between drivers and the management system via the dashboard's communication hub, supporting real-time messaging, order-specific threads, and direct messaging.  
All driver submissions (e.g., alerts, incident reports, status updates) must be updated on the dashboard in real time using Supabase Realtime subscriptions.

### User Experience Rule
Both the mobile app (React Native with Expo) and dashboard (Next.js with Tailwind CSS) must feature intuitive, responsive, and user-friendly interfaces, optimized for desktop, tablet, and mobile screens.  
Security measures, including Supabase Auth with JWT, Row Level Security (RLS), and data encryption, must be implemented to protect sensitive order and transportation data.

### Scalability Rule
The application architecture must be designed to scale with increasing order volumes and adapt to future operational needs, leveraging Supabase for real-time database scaling and Vercel for serverless deployment.  
Utilize cloud-based infrastructure (Supabase and Vercel) to support growth, with features like code splitting, caching, and static site generation for performance.

### Technical Implementation Rule
Use React Native with Expo for the mobile app to ensure cross-platform compatibility (iOS, Android, and web PWA), with deployment via EAS Build for native apps and Vercel for web.  
Implement the dashboard with Next.js 14 (App Router, Server Components), integrating Supabase for authentication, real-time data, and storage; use Chart.js for analytics visualizations.  
Integrate Google Maps API for navigation and tracking functionalities across both apps, with shared environment variables for consistency.

### Security Protocol Rule
Ensure robust security measures, including Supabase Auth for user authentication and authorization, RLS policies for data access, HTTPS enforcement, and secure handling of API keys via environment variables, to protect user data and order information.

### Documentation Rule
Provide comprehensive documentation covering setup (prerequisites, environment variables, installation), usage (features like order creation, tracking, and reporting), maintenance (testing, performance optimization), and deployment (Vercel for web, EAS for mobile) for both the mobile app and the dashboard.

### Deliverables Compliance Rule
Ensure that all deliverables (mobile app via Expo/EAS, dashboard via Next.js/Vercel, documentation) meet the specified requirements and functionality outlined in the project overview, including cross-platform compatibility, real-time synchronization, and production-ready configurations like CI/CD pipelines.

These refined rules incorporate the specifics from the dashboard and MyApp documentation, aligning the development process with the actual TypeScript Next.js dashboard, React Native Expo mobile app, Supabase backend, Vercel deployment, and integrated features like Google Maps and real-time updates. This ensures high standards of user experience, security, and scalability while reflecting the current codebase structure in `/workspaces/MobileOrderTracker/dashboard` and `/workspaces/MobileOrderTracker/MyApp`.

# Geofence Features in Mobile Order Tracker

Geofencing is a core capability in the Mobile Order Tracker ecosystem, leveraging GPS, Wi-Fi, and cellular data to create virtual boundaries (or "fences") around key locations such as warehouses, delivery zones, loading/unloading points, or restricted areas. This feature enhances operational efficiency, automates workflows, and provides real-time insights for logistics management. In the context of the dashboard (Next.js-based) and mobile app (React Native with Expo), geofencing integrates seamlessly with Google Maps API for visualization and `react-native-maps` for native mobile performance, ensuring cross-platform consistency.

Below is an expanded overview of geofence features, including implementation details, use cases, and benefits tailored to the application's architecture.

## Core Functionality

### Geofence Creation and Configuration
- **Dashboard Interface**: Administrators can define geofences via an intuitive form in the `/geofences` route. Specify parameters like:
  - **Shape and Size**: Circular (radius in meters), polygonal (custom coordinates), or rectangular boundaries.
  - **Location**: Geocode addresses or plot directly on the interactive Google Maps view using `@react-google-maps/api`.
  - **Attributes**: Assign to specific orders, drivers, or routes; set dwell time thresholds (e.g., minimum 2 minutes inside to trigger an event).
  - **Triggers**: Entry (e.g., vehicle arrives at pickup), Exit (e.g., leaves delivery zone), or Dwell (e.g., time spent in loading area exceeds limit).
- **Mobile App Support**: Drivers can view active geofences overlaid on their navigation map in the app, with haptic/vibration alerts for proximity.
- **Storage and Sync**: Geofences are stored in Supabase tables (e.g., `geofences` with RLS policies for role-based access) and synced in real-time via Supabase Realtime subscriptions.

### Visualization on Interactive Maps
- **Dashboard**: Render geofences as semi-transparent polygons or circles on the live tracking map in `/tracking`. Use polylines for route integration and markers for entry/exit history.
  - Zoom/pan controls allow drilling down to multiple zones.
  - Color-coding: Green for active, red for breached, blue for historical.
- **Mobile App**: Overlay geofences on `react-native-maps` for turn-by-turn navigation, with dynamic updates as the driver's location changes (background location tracking enabled via Expo Location).
- **Shared Benefits**: Reduces manual verification; e.g., visualize all delivery zones for a route to optimize planning.

### Activation and Deactivation
- **Toggles**: Simple on/off switches per geofence in the dashboard, with bulk actions for fleets or regions.
- **Scheduling**: Time-based activation (e.g., active only during business hours) using Supabase Edge Functions for cron-like triggers.
- **Conditional Logic**: Auto-deactivate upon order completion or driver deactivation, ensuring no lingering monitoring.

## Advanced Triggers and Automations
- **Event-Driven Alerts**: When a vehicle enters/exits a geofence:
  - **Notifications**: Push alerts to drivers (via Expo Notifications) and dispatchers (in-app toasts or email/SMS via Supabase integrations).
  - **Status Updates**: Auto-update order status (e.g., "Arrived at Pickup" on entry to loading zone) and log timestamps in Supabase for audit trails.
  - **Incident Triggers**: Detect anomalies like unauthorized entry (e.g., driver in restricted zone) and flag for review in the `/incidents` module.
- **Route Optimization**: Integrate with Google Maps Directions API to suggest routes that minimize geofence breaches or optimize time in high-priority zones.
- **Dwell Time Monitoring**: Track time spent in zones to identify bottlenecks (e.g., prolonged loading delays) and feed data into analytics.

## Integration with Other App Modules
- **Order Management**: Link geofences to specific orders during creation in `/orders`. QR codes can encode geofence IDs for quick mobile access.
- **Live Tracking**: Overlay geofence events on the real-time map in `/tracking`, with historical playback showing entry/exit timestamps.
- **Incident Management**: Auto-generate incidents for geofence violations (e.g., "Early Departure from Warehouse") in `/incidents`, with severity levels (low/medium/high).
- **Driver Management**: Monitor driver compliance (e.g., adherence to geofenced routes) in `/drivers` profiles, with performance scores based on zone interactions.
- **Analytics & Reporting**:
  - Charts in `/analytics` visualizing geofence metrics (e.g., average dwell time, entry frequency) using Chart.js.
  - KPIs like "On-Time Zone Arrival Rate" or "Zone Breach Incidents per Route."
- **Communication Hub**: Thread messages tied to geofence events (e.g., "Driver entered delivery zone—confirm unload?").

## Use Cases in Logistics
- **Automated Check-Ins/Out**: Drivers no longer manually tap "Arrived"—geofence entry auto-logs it, reducing errors and speeding up workflows.
- **Theft Prevention**: Set geofences around high-value storage; exit without authorization triggers immediate alerts.
- **Compliance and Safety**: Enforce speed limits or rest zones for drivers, integrating with background location for 24/7 monitoring.
- **Dynamic Delivery Zones**: For urban deliveries, create temporary geofences around construction sites or events to reroute automatically.
- **Efficiency Gains**: Analyze zone data to optimize warehouse layouts or predict peak loading times.

## Technical Implementation Notes
- **Backend**: Supabase Edge Functions handle geofence computations (e.g., polygon intersection with GPS points) for low-latency processing.
- **Frontend**:
  - **Dashboard**: Server Components fetch geofence data on load; Client Components handle map interactions.
  - **Mobile**: Expo Location for high-accuracy tracking (with user permissions); fallback to low-power mode outside active routes.
- **Performance**: Limit active geofences per device to 20 to avoid battery drain; use geohashing for efficient Supabase queries.
- **Security**: RLS ensures drivers only see assigned geofences; encrypt location data in transit.
- **Scalability**: Cloud-based (Vercel/Supabase) handles high-volume fleets; test with simulated GPS data in development.

## Benefits and ROI
- **Efficiency**: Automates 30-50% of manual status updates, per industry benchmarks.
- **Cost Savings**: Reduces fuel waste from inefficient routing and minimizes delays (up to 20% faster deliveries).
- **Customer Satisfaction**: Real-time ETAs based on geofence progress.
- **Compliance**: Audit-ready logs for regulatory needs (e.g., DOT standards).

