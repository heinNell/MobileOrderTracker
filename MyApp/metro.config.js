const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Add support for additional file extensions
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  'db',
];

// Platform-specific extension resolution order
// For web: prioritize .web.js over .js, and exclude .native.js
// For native: prioritize .native.js over .js, and exclude .web.js
const isWeb = process.env.EXPO_PUBLIC_PLATFORM === 'web' || process.env.EXPO_PLATFORM === 'web';

if (isWeb) {
  config.resolver.sourceExts = ['web.js', 'web.ts', 'web.tsx', 'ts', 'tsx', 'js', 'jsx'];
} else {
  config.resolver.sourceExts = ['native.js', 'native.ts', 'native.tsx', 'ts', 'tsx', 'js', 'jsx'];
}

// Add resolver blockList to prevent native-only modules on web
// Block all .native.js files when building for web
const blockList = config.resolver.blockList || [];
const nativeFileBlockList = process.env.EXPO_PUBLIC_PLATFORM === 'web' || process.env.EXPO_PLATFORM === 'web'
  ? [/\.native\.js$/]
  : [];

config.resolver.blockList = [
  ...blockList,
  ...nativeFileBlockList,
  /react-native-maps\/lib\/.*NativeComponent\.js$/,
];

// Add alias shortcuts
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@': path.resolve(projectRoot, './app'),
  '@components': path.resolve(projectRoot, './app/components'),
  '@shared': path.resolve(workspaceRoot, './shared'),
  '@utils': path.resolve(projectRoot, './app/utils'),
  '@services': path.resolve(projectRoot, './app/services'),
};

// Let Metro watch parent directories too
config.watchFolders = [
  workspaceRoot,
];

config.resolver.platforms = ['ios', 'android', 'web', 'native'];

module.exports = config;
