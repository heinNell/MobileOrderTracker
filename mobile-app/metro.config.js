const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add resolver for expo-router
config.resolver.extraNodeModules = {
  'expo-router': path.resolve(__dirname, 'node_modules/expo-router'),
};

// Add any additional project-specific configurations here
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

module.exports = config;
