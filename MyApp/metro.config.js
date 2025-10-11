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
  '@': path.resolve(__dirname, './src'),
  '@components': path.resolve(__dirname, './src/components'),
  '@screens': path.resolve(__dirname, './src/screens'),
  '@shared': path.resolve(__dirname, '../shared'),
  '@utils': path.resolve(__dirname, './src/utils'),
  '@services': path.resolve(__dirname, './src/services'),
  '@types': path.resolve(__dirname, './src/types'),
};

module.exports = config;
