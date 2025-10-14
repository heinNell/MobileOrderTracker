module.exports = {
  env: {
    browser: true,
    es2021: true,
    'react-native/react-native': true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: [
    'react',
    'react-native',
    'unused-imports',
  ],
  rules: {
    'no-unused-vars': 'error',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off', // ← Add this line
    'react-native/no-unused-styles': 'error',
    'react-native/split-platform-components': 'error',
    'react-native/no-inline-styles': 'error',
    'react-native/no-color-literals': 'error',
    'unused-imports/no-unused-imports': 'error',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};