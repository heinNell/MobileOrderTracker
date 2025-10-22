// Stub for react-native-maps on web platform
// This file prevents webpack from trying to bundle native react-native-maps code

module.exports = new Proxy(
  {},
  {
    get(target, prop) {
      throw new Error(
        `react-native-maps is not available on web. Use @react-google-maps/api instead. ` +
        `You're trying to access: ${String(prop)}`
      );
    },
  }
);
