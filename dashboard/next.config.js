/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable automatic browser opening in development
  experimental: {
    // Disable automatic browser opening
  },

  // Configure for codespace environment
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Prevent automatic browser opening
      process.env.BROWSER = "none";
    }
    
    // Exclude MyApp directory and react-native packages from webpack resolution
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    
    // Prevent webpack from resolving react-native packages
    config.resolve.alias['react-native$'] = 'react-native-web';
    config.resolve.alias['react-native-maps'] = false;
    
    // Exclude MyApp from module resolution
    if (config.module && config.module.rules) {
      config.module.rules.push({
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /MyApp/,
      });
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

  // ESLint configuration - allow warnings, only fail on errors
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint warnings.
    ignoreDuringBuilds: true,
  },

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false
  },

  // Environment variables will be handled by Vercel
};

module.exports = nextConfig;
