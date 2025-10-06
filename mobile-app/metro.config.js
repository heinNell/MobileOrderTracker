const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Add the shared folder as a watched folder
config.watchFolders = [path.resolve(__dirname, "../shared")];

// Include the shared folder in module resolution
config.resolver.platforms = ["native", "android", "ios", "web"];

// Add support for TypeScript files
config.resolver.sourceExts.push("ts", "tsx");

// Handle the shared folder properly
config.resolver.alias = {
  "@shared": path.resolve(__dirname, "../shared"),
};

module.exports = config;
