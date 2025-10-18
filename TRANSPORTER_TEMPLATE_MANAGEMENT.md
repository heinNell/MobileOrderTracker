# Management System for Transporters and Templates

This document describes the new management system for transporters, templates, and user synchronization implemented as part of Option 3.

## Overview

Three new management pages have been added to the dashboard to provide comprehensive control over:
1. **Transporters** - Manage supplier/transporter companies
2. **Templates** - Create reusable order templates
3. **User Sync** - Synchronize auth.users to public.users (Option 3)

## Features

### 1. Transporter Management (`/transporters`)

#### Purpose
Manage transporter/supplier companies that handle deliveries. This integrates with the existing transporter_supplier field in orders and the `transporters` table from the enhanced-preconfiguration-system.

#### Features
- ✅ **Create Transporter**: Add new transporter companies with full details
- ✅ **Edit Transporter**: Update existing transporter information
- ✅ **Delete Transporter**: Remove transporters (with confirmation)
- ✅ **View All Transporters**: Grid view showing all transporters with key information
- ✅ **Status Management**: Mark transporters as active/inactive or preferred
- ✅ **Rating Display**: Visual representation of performance ratings

#### Fields
- Name (required)
- Company Name
- Contact Information (name, phone, email)
- Pricing (base rate per km, currency)
- Service Types (comma-separated list)
- Status flags (active, preferred)

#### Database Table
Uses the `transporters` table with the following key columns:
- `id`, `tenant_id`, `name`, `company_name`
- `primary_contact_name`, `primary_contact_phone`, `primary_contact_email`
- `base_rate_per_km`, `currency`
- `service_types` (array)
- `is_active`, `is_preferred`
- `performance_rating`

### 2. Order Template Management (`/templates`)

#### Purpose
Create and manage reusable order templates to streamline order creation process. Templates can store default values for common order types.

#### Features
- ✅ **Create Template**: Define new order templates with default values
- ✅ **Edit Template**: Modify existing templates
- ✅ **Delete Template**: Remove templates (with confirmation)
- ✅ **Duplicate Template**: Clone existing templates for quick creation
- ✅ **Usage Tracking**: Display how many times each template has been used
- ✅ **Public/Private Templates**: Share templates across users or keep private

#### Fields
- Template Name (required)
- Description
- Template Type (standard, express, bulk, custom)
- Priority (low, standard, high, urgent)
- Service Type
- Vehicle Type
- Default Loading Instructions
- Default Unloading Instructions
- Status flags (active, public)

#### Database Table
Uses the `order_templates` table with columns:
- `id`, `tenant_id`, `template_name`, `description`
- `template_type`, `default_priority`
- `default_service_type`, `default_vehicle_type`
- `default_loading_instructions`, `default_unloading_instructions`
- `usage_count`, `last_used_at`
- `is_active`, `is_public`

### 3. User Sync Management (`/users`)

#### Purpose
Implements "Option 3" from USER_SYNC_SOLUTION.md - provides a UI for manually synchronizing users from `auth.users` to `public.users` table. This solves the issue where users exist in Supabase Auth but not in the public schema.

#### Features
- ✅ **View All Auth Users**: Display users from auth.users
- ✅ **Sync Status**: Visual indicators showing which users are synced
- ✅ **Bulk Sync**: Sync all unsynced users at once
- ✅ **Manual Add**: Add individual users with custom role/details
- ✅ **Statistics**: Dashboard showing total, synced, and unsynced counts
- ✅ **Automatic Refresh**: Refresh user list on demand

#### Process
1. Fetch users from `auth.users` (requires admin privileges)
2. Check which users exist in `public.users`
3. Display sync status with visual indicators
4. Provide "Manual Add" button for unsynced users
5. Allow editing user details before syncing

#### Manual Add Form
- User ID (read-only, from auth)
- Email
- Full Name
- Role (driver, dispatcher, admin)
- Active status

#### Database Tables
- Source: `auth.users` (Supabase Auth schema)
- Target: `public.users` (application schema)

## Navigation

All three pages are accessible from the dashboard sidebar:
- 🚚 Transporters
- 📄 Templates
- 👥 User Sync

## Technical Implementation

### Architecture
- **Framework**: Next.js 15.5.4 with App Router
- **UI Library**: NextUI 2.6.11
- **Icons**: Heroicons 2.2.0
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS

### Code Structure
```
dashboard/app/
  ├── transporters/page.tsx      # Transporter management
  ├── templates/page.tsx         # Template management
  ├── users/page.tsx             # User sync management
  └── components/
      └── ConditionalLayout.tsx  # Updated with new nav links
```

### Key Components
Each page follows a similar structure:
1. **Main List View**: Display all items with search/filter capabilities
2. **Add/Edit Modal**: Form for creating or editing items
3. **Delete Confirmation**: Safe deletion with user confirmation
4. **Real-time Updates**: Auto-refresh after CRUD operations

### State Management
- Local React state for UI state
- Supabase client for data operations
- No external state management library (keeps it simple)

### Security
- All operations use Supabase RLS (Row Level Security)
- Authentication required for all pages
- Tenant isolation enforced at database level

## Usage Examples

### Creating a Transporter
1. Navigate to `/transporters`
2. Click "Add Transporter"
3. Fill in required fields (name)
4. Optionally add contact info, rates, service types
5. Mark as "Active" and/or "Preferred"
6. Click "Create"

### Creating a Template
1. Navigate to `/templates`
2. Click "Add Template"
3. Set template name and type
4. Configure default values for orders
5. Choose priority level
6. Optionally add default instructions
7. Mark as "Public" to share with team
8. Click "Create"

### Syncing Users (Option 3)
1. Navigate to `/users`
2. View list of auth users with sync status
3. For bulk sync: Click "Sync All Unsynced"
4. For individual: Click "Manual Add" on specific user
5. Review/edit user details in modal
6. Click "Add to Public Users"

## Integration with Existing System

### Orders Integration
- Transporters can be selected when creating orders
- Templates can be used to pre-fill order forms
- Users are required for driver assignments

### Database Schema Compatibility
All new pages use existing tables from `enhanced-preconfiguration-system.sql`:
- `transporters` table (already defined)
- `order_templates` table (already defined)
- `users` table (already defined)

### Future Enhancements
- [ ] Advanced search and filtering
- [ ] Bulk import/export for transporters
- [ ] Template categories and tags
- [ ] User role management and permissions
- [ ] Performance analytics for transporters
- [ ] Template usage statistics
- [ ] Automated user sync trigger

## Testing

### Manual Testing Checklist
- [ ] Create a new transporter
- [ ] Edit existing transporter
- [ ] Delete transporter (verify confirmation)
- [ ] Create a new template
- [ ] Duplicate a template
- [ ] Edit template
- [ ] Delete template
- [ ] View user sync status
- [ ] Manually add a user
- [ ] Bulk sync users
- [ ] Verify all navigation links work
- [ ] Check mobile responsiveness

### Build Verification
```bash
cd dashboard
npm run build
# Should complete successfully
```

## Troubleshooting

### Common Issues

**Issue**: "admin.listUsers is not available"
- **Solution**: User sync requires service role key. For production, implement a server-side API endpoint.

**Issue**: "Cannot insert into transporters table"
- **Solution**: Ensure the `transporters` table exists. Run `enhanced-preconfiguration-system.sql` migration.

**Issue**: "Tenant ID missing"
- **Solution**: Ensure user is authenticated and has a tenant_id in their profile.

## References

- [ENHANCED_FEATURES.md](../ENHANCED_FEATURES.md) - Existing transporter integration
- [USER_SYNC_SOLUTION.md](../USER_SYNC_SOLUTION.md) - Option 3 explanation
- [enhanced-preconfiguration-system.sql](../enhanced-preconfiguration-system.sql) - Database schema

## Deployment

The new pages are automatically included in the Next.js build:
```bash
npm run build
npm start
```

Or deploy to Vercel:
```bash
vercel deploy
```

All pages are properly typed and compiled with TypeScript, ensuring type safety across the application.
