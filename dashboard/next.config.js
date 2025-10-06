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

  // Ensure proper MIME type handling
  async headers() {
    return [
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/static/css/(.*).css",
        headers: [
          {
            key: "Content-Type",
            value: "text/css",
          },
        ],
      },
      {
        source: "/_next/static/js/(.*).js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript",
          },
        ],
      },
    ];
  },

  // Output configuration for better production builds
  output: "standalone",

  // Environment variables will be handled by Netlify
};

module.exports = nextConfig;
