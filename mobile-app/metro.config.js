const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Resolve the path to the shared directory
const sharedPath = path.resolve(__dirname, '../shared');

// Add alias for @shared modules
config.resolver.alias = {
  '@shared': sharedPath,
};

// Watch the shared directory for changes
config.watchFolders = [sharedPath];

// Ensure TypeScript files from shared are transpiled
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'ts', 'tsx'];

module.exports = config;