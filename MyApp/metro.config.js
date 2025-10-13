const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for additional file extensions
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  // Adds support for `.db` files for SQLite databases
  'db'
];

// Add support for TypeScript paths
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@': path.resolve(__dirname, './app'),
  '@components': path.resolve(__dirname, './app/components'),
  '@screens': path.resolve(__dirname, './app/screens'),
  '@shared': path.resolve(__dirname, '../shared'),
  '@utils': path.resolve(__dirname, './app/utils'),
  '@services': path.resolve(__dirname, './app/services'),
  '@types': path.resolve(__dirname, './app/types'),
};

// Enable symlinks for shared directory
config.resolver.platforms = ['ios', 'android', 'native', 'web'];
config.watchFolders = [
  path.resolve(__dirname, '../shared'),
  path.resolve(__dirname, './app')
];

module.exports = config;
