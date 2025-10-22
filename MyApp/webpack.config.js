const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: ['@react-google-maps/api'],
      },
    },
    argv
  );

  // Add resolver to prioritize .web.js over .native.js
  config.resolve.extensions = [
    '.web.tsx',
    '.web.ts',
    '.web.js',
    '.web.jsx',
    '.tsx',
    '.ts',
    '.js',
    '.jsx',
    '.json',
  ];

  // Alias react-native-maps to a stub on web to prevent imports
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native-maps': require.resolve('./stubs/react-native-maps.web.js'),
  };

  // Replace .native.js files with empty modules for web
  const webpack = require('webpack');
  config.plugins.push(
    new webpack.NormalModuleReplacementPlugin(
      /\.native\.js$/,
      require.resolve('./stubs/empty-module.js')
    )
  );

  return config;
};
