/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable automatic browser opening in development
  experimental: {
    // Disable automatic browser opening
  },

  // Configure for codespace environment
  webpack: (config, { dev }) => {
    if (dev) {
      // Prevent automatic browser opening
      process.env.BROWSER = "none";
    }
    return config;
  },

  // Image optimization settings
  images: {
    domains: ["liagltqpeilbswuqcahp.supabase.co"],
  },

  // Environment variables will be handled by Netlify
};

module.exports = nextConfig;
