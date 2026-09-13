module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 moved its transform into react-native-worklets.
    // `react-native-reanimated/plugin` still works as a re-export, but
    // naming the real package means an upgrade that drops the shim fails
    // at install rather than at runtime.
    plugins: ['react-native-worklets/plugin'],
  };
};
