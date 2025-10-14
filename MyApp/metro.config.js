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

// Ensure all JS/TS extensions are recognized
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'ts',
  'tsx',
  'js',
  'jsx',
];

// Add alias shortcuts - ONLY for folders that exist
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@': path.resolve(projectRoot, './app'),
  '@components': path.resolve(projectRoot, './app/components'),
  '@shared': path.resolve(workspaceRoot, './shared'), // workspace shared
  '@utils': path.resolve(projectRoot, './app/utils'),
  '@services': path.resolve(projectRoot, './app/services'),
  // Removed @screens and @types since they don't exist
};

// Let Metro watch parent directories too
config.watchFolders = [
  workspaceRoot,
];

config.resolver.platforms = ['ios', 'android', 'web', 'native'];

module.exports = config;