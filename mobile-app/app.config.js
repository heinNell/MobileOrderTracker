// app.config.js
import 'dotenv/config';

export default ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      // Environment variables (prefer .env over hardcoded values)
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || config.extra.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || config.extra.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      EXPO_PUBLIC_SUPABASE_PROJECT_ID: process.env.EXPO_PUBLIC_SUPABASE_PROJECT_ID || config.extra.EXPO_PUBLIC_SUPABASE_PROJECT_ID,
      EXPO_PUBLIC_QR_CODE_SECRET: process.env.EXPO_PUBLIC_QR_CODE_SECRET || config.extra.EXPO_PUBLIC_QR_CODE_SECRET,
      EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || config.extra.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      EXPO_PUBLIC_TENANT_ID: process.env.EXPO_PUBLIC_TENANT_ID || config.extra.EXPO_PUBLIC_TENANT_ID || 'default-tenant',
      EXPO_PUBLIC_VERSION: config.version,
      EXPO_PUBLIC_IS_PRODUCTION: process.env.NODE_ENV === 'production' || config.extra.EXPO_PUBLIC_IS_PRODUCTION,
      EXPO_PUBLIC_MOBILE_DOMAIN: process.env.EXPO_PUBLIC_MOBILE_DOMAIN || config.extra.EXPO_PUBLIC_MOBILE_DOMAIN,
      EXPO_PUBLIC_DASHBOARD_URL: process.env.EXPO_PUBLIC_DASHBOARD_URL || config.extra.EXPO_PUBLIC_DASHBOARD_URL,
      
      // Aliases for backward compatibility
      qrSecretKey: process.env.EXPO_PUBLIC_QR_CODE_SECRET || config.extra.EXPO_PUBLIC_QR_CODE_SECRET,
      tenantId: process.env.EXPO_PUBLIC_TENANT_ID || config.extra.EXPO_PUBLIC_TENANT_ID || 'default-tenant',
      version: config.version,
      isProduction: process.env.NODE_ENV === 'production',
      
      // EAS
      eas: {
        projectId: config.extra?.eas?.projectId,
      },
    },
  };
};