# 📋 Order Templates - Complete Guide

## 🎯 What Are Order Templates?

Order templates are pre-configured order settings that save you time by auto-filling:

- ✅ Transporter/carrier details
- ✅ Customer contact information
- ✅ Loading and unloading contacts
- ✅ Loading and unloading locations (geofences)
- ✅ Service types and vehicle preferences
- ✅ Time windows and scheduling
- ✅ Special instructions and handling notes
- ✅ Default priorities and settings

**Time Savings:** Create orders in 30 seconds instead of 10 minutes! ⚡

---

## 🗺️ Where to Find Templates

### Option 1: Direct URL

Navigate to: **`http://localhost:3000/dashboard/templates`**

### Option 2: Sidebar Navigation

1. Open dashboard: `http://localhost:3000/dashboard`
2. Look in the sidebar under **"Pre-Configuration"** section:
   ```
   ┌─────────────────────────┐
   │ PRE-CONFIGURATION       │
   ├─────────────────────────┤
   │ 📋 Templates            │ ← Click here!
   │ 🚛 Transporters         │
   │ 👥 Contacts             │
   └─────────────────────────┘
   ```

---

## 🆕 How to Create a Template

### Step 1: Navigate to Templates Page

Go to: `/dashboard/templates`

### Step 2: Click "Create Template" Button

Look for the large blue button in the top-right corner.

### Step 3: Fill in Template Details

The template creation modal has **7 tabs** with comprehensive options:

#### Tab 1: **Basic Info**

```
Template Name: "LA → SF Express Route"
Type: "Express Delivery"
Description: "Standard express delivery from LA to San Francisco"
```

#### Tab 2: **Defaults** (Link Pre-Configured Entities)

```
Default Transporter: [Select...] → Choose from transporters list
  Example: "ABC Transport"

Default Customer: [Select...] → Choose from contacts (type: customer)
  Example: "John Doe - Acme Corp"

Default Loading Contact: [Select...] → Choose from contacts (type: loading)
  Example: "Warehouse Manager"

Default Unloading Contact: [Select...] → Choose from contacts (type: unloading)
  Example: "Site Supervisor"
```

**💡 Pro Tip:** These dropdowns pull from your pre-configured:

- Transporters (create at `/dashboard/transporters`)
- Contacts (create at `/dashboard/contacts`)

#### Tab 3: **Locations** (Link Geofences)

```
Loading Location: [Select...] → Choose from geofences (type: loading)
  Example: "LA Warehouse"
  Shows: Name, Address, Coordinates, Contact

Unloading Location: [Select...] → Choose from geofences (type: unloading)
  Example: "SF Customer Site"
  Shows: Name, Address, Coordinates, Contact
```

**💡 Pro Tip:** Geofences must be created first at `/dashboard/geofences`

#### Tab 4: **Service**

```
Service Type: "Express" / "Standard" / "Priority" / "Economy"
Vehicle Type: "Van" / "Truck" / "Semi" / "Refrigerated"
Priority: "High" / "Normal" / "Low"
```

#### Tab 5: **Time Windows**

```
Loading Time Window: "8:00 AM - 5:00 PM"
Unloading Time Window: "9:00 AM - 6:00 PM"
Lead Time (hours): "2"
```

#### Tab 6: **Instructions**

```
Loading Instructions: "Call 30 minutes before arrival"
Unloading Instructions: "Use loading dock 3, ring bell"
Special Handling: "Handle with care - fragile items"
```

#### Tab 7: **Settings**

```
☑ Active (Enable this template)
☑ Public (Share with team members)
☐ Is Default (Auto-select for new orders)

Tags: [express] [recurring] [priority]
```

### Step 4: Click "Create Template"

Your template is now saved and ready to use! 🎉

---

## 🚀 How to Use Templates When Creating Orders

### Method 1: Quick Create (Recommended)

1. **Go to Orders:** `/dashboard/orders`
2. **Click:** "Create New Order" button
3. **Look for:** "Load from Template" button at the top of the form
4. **Click:** "Load from Template"
5. **Select:** Your desired template from the list
6. **Magic! ✨** All fields auto-fill:
   - Transporter details
   - Customer information
   - Loading/unloading locations with coordinates
   - Contacts at each location
   - Service preferences
   - Instructions
7. **Review:** Make any one-off changes if needed
8. **Submit:** Click "Submit Order"

**Result:** Order created in ~30 seconds! vs 10 minutes manually ⚡

### Method 2: Browse Templates First

1. **Go to Templates:** `/dashboard/templates`
2. **Browse:** Your saved templates
3. **Click:** "Use Template" button on the desired template
4. **Redirects:** To order creation form with template pre-loaded
5. **Submit:** Review and submit order

---

## 📊 Template Management Features

### View Template Details

Each template card shows:

```
┌─────────────────────────────────────┐
│ 📋 LA → SF Express Route            │
│ Express Delivery                    │
│ ─────────────────────────────────── │
│ 🚛 ABC Transport                    │
│ 👤 John Doe (Acme Corp)             │
│ 📍 LA Warehouse → SF Customer       │
│ 🔥 Used 89 times                    │
│ Last used: 2 hours ago              │
│ ─────────────────────────────────── │
│ [Duplicate] [Edit] [Delete]         │
└─────────────────────────────────────┘
```

### Template Statistics

Dashboard shows:

- Total templates created
- Active templates
- Public templates (shared with team)
- Total usage count across all templates

### Template Actions

**Duplicate:** Clone an existing template to create variations

- Example: Clone "LA → SF Express" to create "LA → SF Standard"

**Edit:** Modify template details

- Update locations, contacts, instructions
- Change service types or preferences
- Activate/deactivate templates

**Delete:** Remove unused templates

- Confirmation required
- Does not affect existing orders

---

## 🎯 Best Practices for Templates

### 1. Create Templates for Recurring Routes

```
✅ "LA → SF Express Route"
✅ "NY → Boston Standard"
✅ "Miami → Orlando Priority"
```

### 2. Create Templates by Customer

```
✅ "Acme Corp - Standard Delivery"
✅ "Widgets Inc - Express Service"
✅ "Big Box Store - Daily Route"
```

### 3. Create Templates by Service Type

```
✅ "Express Delivery Template"
✅ "Same-Day Service Template"
✅ "Standard Ground Template"
```

### 4. Use Descriptive Names

```
✅ GOOD: "LA Warehouse → SF Downtown (Express, ABC Transport)"
❌ BAD: "Template 1"
```

### 5. Keep Templates Updated

- Update locations when addresses change
- Update contacts when personnel changes
- Update pricing/service levels as needed

---

## 🔗 Prerequisites for Templates

Before creating templates, ensure you have:

### ✅ 1. Transporters Created

- Navigate to: `/dashboard/transporters`
- Click: "+ Add Transporter"
- Fill in: Company details, contact info, services, pricing

### ✅ 2. Contacts Created

- Navigate to: `/dashboard/contacts`
- Click: "+ Add Contact"
- Create contacts for:
  - **Customers** (type: customer)
  - **Loading contacts** (type: loading)
  - **Unloading contacts** (type: unloading)

### ✅ 3. Geofences Created

- Navigate to: `/dashboard/geofences`
- Click: "+ Add Geofence"
- Create geofences for:
  - **Loading points** (type: loading)
  - **Unloading points** (type: unloading)

**Once these are set up, you can create powerful templates that link everything together!**

---

## 📈 Template Workflow Example

### Scenario: Setting Up "LA → SF Express Route"

#### Step 1: Create Prerequisites

**A. Create Transporter:**

```
Name: ABC Transport
Company: ABC Logistics Inc
Contact: John Manager
Phone: (555) 123-4567
Service Types: Express, Standard
Rate: $2.50/km
```

**B. Create Customer Contact:**

```
Name: Jane Doe
Company: Acme Corp
Type: Customer
Phone: (555) 111-2222
Email: jane@acme.com
```

**C. Create Loading Contact:**

```
Name: Bob Warehouse
Company: ABC Logistics
Type: Loading
Phone: (555) 333-4444
Location: LA Warehouse
```

**D. Create Unloading Contact:**

```
Name: Alice Site
Company: Acme Corp
Type: Unloading
Phone: (555) 555-6666
Location: SF Customer Site
```

**E. Create Loading Geofence:**

```
Name: LA Warehouse
Type: Loading Point
Latitude: 33.9416
Longitude: -118.4085
Radius: 100m
Contact: Bob Warehouse
```

**F. Create Unloading Geofence:**

```
Name: SF Customer Site
Type: Unloading Point
Latitude: 37.7749
Longitude: -122.4194
Radius: 100m
Contact: Alice Site
```

#### Step 2: Create Template

Navigate to `/dashboard/templates` and click "+ Create Template"

**Fill in:**

```
[Basic Info]
  Name: LA → SF Express Route
  Type: Express Delivery
  Description: Standard express delivery LA to SF for Acme Corp

[Defaults]
  Transporter: ABC Transport
  Customer: Jane Doe (Acme Corp)
  Loading Contact: Bob Warehouse
  Unloading Contact: Alice Site

[Locations]
  Loading Location: LA Warehouse
  Unloading Location: SF Customer Site

[Service]
  Service Type: Express
  Vehicle Type: Van
  Priority: High

[Time Windows]
  Loading: 8:00 AM - 5:00 PM
  Unloading: 9:00 AM - 6:00 PM
  Lead Time: 2 hours

[Instructions]
  Loading: "Call 30 min before arrival"
  Unloading: "Use loading dock 3"
  Special: "Handle with care"

[Settings]
  ☑ Active
  ☑ Public
  Tags: express, acme, recurring
```

Click **"Create Template"** ✅

#### Step 3: Use Template

1. Go to `/dashboard/orders`
2. Click "Create New Order"
3. Click "Load from Template"
4. Select "LA → SF Express Route"
5. **ALL FIELDS AUTO-FILL!** ✨
6. Review and click "Submit Order"

**Time to create order:** ~30 seconds vs 10 minutes! 🚀

---

## 🎓 Advanced Template Features

### Template Inheritance

- Clone popular templates to create variations
- Maintain consistent settings across similar routes
- Update base template, then update clones

### Template Analytics

- Track usage count per template
- See last used date
- Identify popular vs unused templates
- Optimize based on usage patterns

### Team Sharing

- Mark templates as "Public" to share with team
- Each user can create private templates
- Admins can manage all templates

### Smart Suggestions

When creating an order, the system suggests relevant templates based on:

- Selected customer
- Loading/unloading locations
- Service type
- Recent usage history

---

## 🔧 Troubleshooting

### Issue 1: "Can't find Templates page"

**Solution:**

- Templates are now in the sidebar under "Pre-Configuration"
- Or navigate directly to: `/dashboard/templates`

### Issue 2: "No transporters/contacts/geofences available"

**Solution:**

- Create prerequisites first:
  - Transporters: `/dashboard/transporters`
  - Contacts: `/dashboard/contacts`
  - Geofences: `/dashboard/geofences`

### Issue 3: "Template doesn't load all fields"

**Solution:**

- Ensure all linked entities still exist
- Check that entities are marked as "Active"
- Verify tenant IDs match
- Re-save template if entities were updated

### Issue 4: "Can't see 'Load Template' button in order form"

**Solution:**

- Button is at the top of the order creation modal
- Look for: "Load from Template" or "Use Template"
- If missing, templates feature may need to be enabled

---

## 📋 Quick Reference

| Task                   | URL                                                    | Action                   |
| ---------------------- | ------------------------------------------------------ | ------------------------ |
| **View Templates**     | `/dashboard/templates`                                 | Browse saved templates   |
| **Create Template**    | `/dashboard/templates` → "+ Create Template"           | New template wizard      |
| **Use Template**       | `/dashboard/orders` → "Create Order" → "Load Template" | Auto-fill order form     |
| **Edit Template**      | `/dashboard/templates` → [Edit] button                 | Modify existing template |
| **Delete Template**    | `/dashboard/templates` → [Delete] button               | Remove template          |
| **Create Transporter** | `/dashboard/transporters`                              | Add carrier/supplier     |
| **Create Contact**     | `/dashboard/contacts`                                  | Add person/company       |
| **Create Geofence**    | `/dashboard/geofences`                                 | Add location             |

---

## ✅ Summary

**Templates save you time by:**

1. Pre-configuring recurring routes
2. Linking transporters, contacts, and locations
3. Auto-filling order forms in seconds
4. Maintaining consistency across orders
5. Reducing manual data entry errors

**To get started:**

1. ✅ Create transporters, contacts, and geofences
2. ✅ Navigate to `/dashboard/templates`
3. ✅ Click "+ Create Template"
4. ✅ Fill in the 7-tab form linking everything
5. ✅ Save and use when creating orders!

---

**🎉 You now have a complete order template system! Access it in the sidebar under "Pre-Configuration" → "📋 Templates"**
