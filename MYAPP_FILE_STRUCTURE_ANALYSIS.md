# MyApp File Structure Analysis

## Root Structure

```
MyApp/
├── App.js                          # Root app component (expo-router entry)
├── app/                           # App directory (expo-router file-based routing)
│   ├── index.js                   # Root redirect component
│   ├── login.js                   # Login screen
│   ├── _layout.js                 # Root layout with AuthProvider
│   ├── (tabs)/                    # Tab navigation group
│   │   ├── _layout.js             # Tab layout configuration
│   │   ├── index.js              # Dashboard (main driver screen)
│   │   ├── orders.js             # Orders list (security filtered)
│   │   ├── scanner.js            # QR code scanner
│   │   ├── order-details.js      # Order details view
│   │   └── profile.js            # Driver profile
│   ├── context/                   # React contexts
│   ├── lib/                      # Libraries (supabase config)
│   ├── services/                 # Services (location, etc)
│   └── components/               # Shared components
└── package.json                  # Dependencies
```

## File Purposes & Integration

### 1. Navigation Flow

- `App.js` → `app/_layout.js` → `app/index.js` → `app/(tabs)/_layout.js` → Tab screens

### 2. Authentication Flow

- `app/_layout.js`: Provides AuthContext to entire app
- `app/index.js`: Redirects based on auth state (login vs tabs)
- `app/login.js`: Login screen for unauthenticated users
- All tab screens: Protected by authentication

### 3. Tab Screens Functionality

- `app/(tabs)/index.js`: **Dashboard** - Shows active order, logout, driver stats
- `app/(tabs)/orders.js`: **Orders List** - Shows ONLY active scanned order (security filtered)
- `app/(tabs)/scanner.js`: **QR Scanner** - Scans dashboard QR codes, sets active order
- `app/(tabs)/order-details.js`: **Order Details** - Detailed view of selected order
- `app/(tabs)/profile.js`: **Driver Profile** - Driver information and settings

### 4. Security Model

- Driver can only see orders they've scanned via QR codes from dashboard
- ActiveOrderId stored in AsyncStorage after QR scan
- Orders screen filtered to show only active order
- Location tracking starts after QR authentication

### 5. Current Issues

- **CRITICAL**: Multiple default exports in `app/(tabs)/index.js`
- **CRITICAL**: Duplicate component definitions causing syntax errors
- Need to clean up the dashboard component structure

## Fix Plan

### Step 1: Fix Syntax Errors ✅ COMPLETED

- ✅ Remove duplicate exports from dashboard
- ✅ Ensure single default export per file
- ✅ Clean up component structure
- ✅ Add missing ErrorBoundary class definition

### Step 2: Verify Navigation

- Ensure proper routing between screens
- Test authentication redirects
- Verify tab navigation works

### Step 3: Test Core Workflow

- Login → Dashboard → QR Scan → Order Tracking → Logout
- Verify security filters work correctly
- Test location tracking integration

### Step 4: Component Integration

- Dashboard shows active order status
- Orders screen shows filtered results
- Scanner integrates with AsyncStorage and LocationService
- Proper cleanup on logout
