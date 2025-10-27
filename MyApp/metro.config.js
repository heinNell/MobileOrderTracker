const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Web-specific configuration for Expo SDK 54
config.resolver.sourceExts = [...config.resolver.sourceExts, 'web.js', 'web.ts', 'web.tsx'];
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');

// Platform-specific extension resolution order
config.resolver.platforms = ['ios', 'android', 'web', 'native'];

// Add resolver blockList to prevent native-only modules on web
config.resolver.blockList = [
  /react-native-maps\/lib\/.*NativeComponent\.js$/,
  /\.native\.js$/,
];

// Add alias shortcuts
config.resolver.alias = {
  ...config.resolver.alias,
  '@': path.resolve(projectRoot, './app'),
  '@components': path.resolve(projectRoot, './app/components'),
  '@shared': path.resolve(workspaceRoot, './shared'),
  '@utils': path.resolve(projectRoot, './app/utils'),
  '@services': path.resolve(projectRoot, './app/services'),
  // Web-specific alias for react-native-maps
  'react-native-maps': require.resolve('./stubs/react-native-maps.web.js'),
};

// Let Metro watch parent directories too
config.watchFolders = [workspaceRoot];

// Configure SVG transformer
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

// Add development environment optimizations
if (process.env.NODE_ENV === 'development') {
  // Disable Fast Refresh on web to prevent property redefinition errors
  config.server = {
    ...config.server,
    enhanceMiddleware: (middleware, server) => {
      return (req, res, next) => {
        // Add cache headers to prevent module redefinition
        if (req.url && req.url.includes('/.expo/')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
        return middleware(req, res, next);
      };
    },
  };
}

module.exports = config;
