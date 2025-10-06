const createExpoWebpackConfigAsync = require("@expo/webpack-config");

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Suppress specific deprecation warnings
  if (config.infrastructureLogging) {
    config.infrastructureLogging.level = "error";
  } else {
    config.infrastructureLogging = { level: "error" };
  }

  // Reduce console output
  config.stats = {
    warnings: false,
    errors: true,
    errorDetails: true,
    modules: false,
    chunks: false,
    colors: true,
  };

  // Add custom alias for shared folder
  config.resolve.alias = {
    ...config.resolve.alias,
    "@shared": require("path").resolve(__dirname, "../shared"),
  };

  return config;
};
