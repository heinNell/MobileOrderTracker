# 🗺️ Dashboard Navigation - Where to Find Everything

## 📍 Sidebar Menu Structure

```
┌────────────────────────────────────┐
│   Mobile Order Tracker            │
├────────────────────────────────────┤
│                                    │
│ 🏠 Dashboard                       │
│ 📦 Orders                          │
│ 📍 Live Tracking                   │
│ ⚠️  Incidents                      │
│ 💬 Messages                        │
│ 🚗 Drivers                         │
│ 📊 Analytics                       │
│ 🗺️  Geofences                      │
│                                    │
│ ─── PRE-CONFIGURATION ───          │
│                                    │
│ 📋 Templates          ← NEW! ✨    │
│ 🚛 Transporters       ← NEW! ✨    │
│ 👥 Contacts           ← NEW! ✨    │
│                                    │
│ ─── SYSTEM ───                     │
│                                    │
│ 🔍 Diagnostics                     │
│                                    │
└────────────────────────────────────┘
```

---

## 🎯 Quick Access URLs

### Main Pages

| Page              | URL                    | What It Does               |
| ----------------- | ---------------------- | -------------------------- |
| **Dashboard**     | `/dashboard`           | Overview and statistics    |
| **Orders**        | `/dashboard/orders`    | Create and manage orders   |
| **Live Tracking** | `/dashboard/tracking`  | Real-time driver locations |
| **Drivers**       | `/dashboard/drivers`   | Manage driver accounts     |
| **Geofences**     | `/dashboard/geofences` | Location management        |

### Pre-Configuration (NEW!)

| Page                | URL                       | What It Does                            |
| ------------------- | ------------------------- | --------------------------------------- |
| **📋 Templates**    | `/dashboard/templates`    | **Order templates for fast creation**   |
| **🚛 Transporters** | `/dashboard/transporters` | **Carrier/supplier management**         |
| **👥 Contacts**     | `/dashboard/contacts`     | **Customer/loading/unloading contacts** |

---

## 🚀 Complete Workflow

### **Scenario:** Creating an order using templates

```
STEP 1: Create Prerequisites (One-time setup)
┌─────────────────────────────────────────┐
│ 1A. Create Transporter                  │
│     → /dashboard/transporters           │
│     → Click "+ Add Transporter"         │
│     → Fill in company details           │
│                                         │
│ 1B. Create Contacts                     │
│     → /dashboard/contacts               │
│     → Click "+ Add Contact"             │
│     → Create: Customer, Loading,        │
│                Unloading contacts       │
│                                         │
│ 1C. Create Geofences                    │
│     → /dashboard/geofences              │
│     → Click "+ Add Geofence"            │
│     → Create: Loading point,            │
│                Unloading point          │
└─────────────────────────────────────────┘
                    ↓
STEP 2: Create Template (One-time setup)
┌─────────────────────────────────────────┐
│ → /dashboard/templates                  │
│ → Click "+ Create Template"             │
│ → Fill in 7 tabs:                       │
│   [Basic Info] Name, type, description  │
│   [Defaults] Link transporter, contacts │
│   [Locations] Link geofences            │
│   [Service] Service & vehicle types     │
│   [Time Windows] Schedules              │
│   [Instructions] Notes & handling       │
│   [Settings] Active, public, tags       │
│ → Click "Create Template"               │
└─────────────────────────────────────────┘
                    ↓
STEP 3: Create Order (Fast! ~30 seconds)
┌─────────────────────────────────────────┐
│ → /dashboard/orders                     │
│ → Click "Create New Order"              │
│ → Click "Load from Template"            │
│ → Select your template                  │
│ → ✨ ALL FIELDS AUTO-FILL! ✨           │
│ → Review and click "Submit"             │
│ ✅ DONE in 30 seconds!                  │
└─────────────────────────────────────────┘
```

---

## 📋 Templates Page Features

### When you visit `/dashboard/templates`:

```
┌─────────────────────────────────────────────────────────┐
│ Order Templates                   [+ Create Template]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 Statistics                                          │
│  ┌────────┬────────┬────────┬────────────┐             │
│  │  10    │   8    │   5    │    142     │             │
│  │ Total  │ Active │ Public │Total Usage │             │
│  └────────┴────────┴────────┴────────────┘             │
│                                                         │
│  🔍 Search and Filter                                   │
│  [Search...________] [Type ▼] [Status ▼]               │
│                                                         │
│  📋 Template List                                       │
│  ┌─────────────────────────────────────────┐           │
│  │ 📋 LA → SF Express Route                │           │
│  │ Express Delivery                        │           │
│  │ ─────────────────────────────────────── │           │
│  │ 🚛 ABC Transport                        │           │
│  │ 👤 John Doe (Acme Corp)                 │           │
│  │ 📍 LA Warehouse → SF Customer Site      │           │
│  │ 🔥 Used 89 times                        │           │
│  │ Last used: 2 hours ago                  │           │
│  │ ─────────────────────────────────────── │           │
│  │ [Duplicate] [Edit] [Delete] [Use]       │           │
│  └─────────────────────────────────────────┘           │
│                                                         │
│  ┌─────────────────────────────────────────┐           │
│  │ 📋 NY → Boston Standard                 │           │
│  │ ... (more templates)                    │           │
│  └─────────────────────────────────────────┘           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🚛 Transporters Page

### Visit `/dashboard/transporters`:

```
┌─────────────────────────────────────────────────────────┐
│ Transporters                      [+ Add Transporter]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 Statistics                                          │
│  ┌────────┬────────┬────────┬────────┐                 │
│  │   12   │   10   │    5   │   8    │                 │
│  │ Total  │ Active │Preferred│Service │                 │
│  │        │        │         │ Types  │                 │
│  └────────┴────────┴────────┴────────┘                 │
│                                                         │
│  🔍 Search and Filter                                   │
│  [Search...________] [Service ▼] [Status ▼]            │
│                                                         │
│  🚛 Transporter List                                    │
│  ┌─────────────────────────────────────────┐           │
│  │ 🚛 ABC Transport                        │           │
│  │ ABC Logistics Inc                       │           │
│  │ ─────────────────────────────────────── │           │
│  │ 📞 (555) 123-4567                       │           │
│  │ 📧 contact@abc.com                      │           │
│  │ 📍 Los Angeles, CA                      │           │
│  │ 🔖 Express | Standard                   │           │
│  │ 💰 $2.50/km | Min: $100                 │           │
│  │ ⭐ Preferred | ✅ Active                │           │
│  │ ─────────────────────────────────────── │           │
│  │ [Edit] [Delete] [Toggle Active]         │           │
│  └─────────────────────────────────────────┘           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 👥 Contacts Page

### Visit `/dashboard/contacts`:

```
┌─────────────────────────────────────────────────────────┐
│ Contacts                              [+ Add Contact]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 Statistics                                          │
│  ┌────────┬────────┬────────┬────────┐                 │
│  │   24   │   20   │   10   │    8   │                 │
│  │ Total  │ Active │Customer│Supplier│                 │
│  └────────┴────────┴────────┴────────┘                 │
│                                                         │
│  🔍 Search and Filter                                   │
│  [Search...________] [Type ▼] [Status ▼]               │
│                                                         │
│  👥 Contact List                                        │
│  ┌─────────────────────────────────────────┐           │
│  │ 👤 John Doe (Acme Corp)                 │           │
│  │ Warehouse Manager                       │           │
│  │ ─────────────────────────────────────── │           │
│  │ 📞 (555) 111-2222                       │           │
│  │ 📧 john@acme.com                        │           │
│  │ 📍 Los Angeles, CA                      │           │
│  │ 🔖 Customer | Primary | ✅ Active       │           │
│  │ ─────────────────────────────────────── │           │
│  │ [Edit] [Delete]                         │           │
│  └─────────────────────────────────────────┘           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Order Creation with Templates

### Visit `/dashboard/orders` → Click "Create New Order":

```
┌─────────────────────────────────────────────────────────┐
│ Create New Order                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🎯 Quick Actions                                       │
│  ┌─────────────────────────────────────────┐           │
│  │  [📋 Load from Template]  ← Click here! │           │
│  │  [🔄 Start from Scratch]                │           │
│  └─────────────────────────────────────────┘           │
│                                                         │
│  When you click "Load from Template":                  │
│  ┌─────────────────────────────────────────┐           │
│  │ Select Template                         │           │
│  │ ─────────────────────────────────────── │           │
│  │ 🔍 Search: [________]                   │           │
│  │                                         │           │
│  │ ○ LA → SF Express Route                 │           │
│  │   Used 89 times | Last used 2h ago      │           │
│  │                                         │           │
│  │ ○ NY → Boston Standard                  │           │
│  │   Used 45 times | Last used yesterday   │           │
│  │                                         │           │
│  │ ○ Miami → Orlando Priority              │           │
│  │   Used 23 times | Last used 5h ago      │           │
│  │                                         │           │
│  │         [Cancel] [Load Template]        │           │
│  └─────────────────────────────────────────┘           │
│                                                         │
│  After selecting template, form auto-fills:            │
│  ┌─────────────────────────────────────────┐           │
│  │ [Basic] [Driver] [Locations] [More...]  │           │
│  │                                         │           │
│  │ Transporter: ABC Transport ✓            │           │
│  │ Customer: John Doe (Acme Corp) ✓        │           │
│  │ Loading: LA Warehouse ✓                 │           │
│  │   Lat: 33.9416, Lng: -118.4085 ✓        │           │
│  │   Contact: Bob Warehouse ✓              │           │
│  │ Unloading: SF Customer Site ✓           │           │
│  │   Lat: 37.7749, Lng: -122.4194 ✓        │           │
│  │   Contact: Alice Site ✓                 │           │
│  │ Service: Express ✓                      │           │
│  │ Instructions: All filled! ✓             │           │
│  │                                         │           │
│  │        [Cancel] [Submit Order]          │           │
│  └─────────────────────────────────────────┘           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Getting Started Checklist

```
PRE-CONFIGURATION SETUP (Do once):
□ Navigate to /dashboard/transporters
□ Create at least 1 transporter
□ Navigate to /dashboard/contacts
□ Create customer contacts (type: customer)
□ Create loading contacts (type: loading)
□ Create unloading contacts (type: unloading)
□ Navigate to /dashboard/geofences
□ Create loading point geofences (type: loading)
□ Create unloading point geofences (type: unloading)

TEMPLATE CREATION (Do once per route):
□ Navigate to /dashboard/templates
□ Click "+ Create Template"
□ Fill in all 7 tabs linking entities
□ Save template

ORDER CREATION (Fast - do anytime):
□ Navigate to /dashboard/orders
□ Click "Create New Order"
□ Click "Load from Template"
□ Select template
□ Review auto-filled form
□ Submit order
✅ Done in 30 seconds!
```

---

## 🎯 Summary

**Access Templates in 3 Ways:**

1. **Sidebar:** Pre-Configuration → 📋 Templates
2. **Direct URL:** `/dashboard/templates`
3. **Order Creation:** "Load from Template" button

**The Pre-Configuration section includes:**

- 📋 **Templates** - Order templates for fast creation
- 🚛 **Transporters** - Carrier/supplier management
- 👥 **Contacts** - Customer and site contacts

**Everything is now in your sidebar! Look for the "PRE-CONFIGURATION" section.** 🎉
