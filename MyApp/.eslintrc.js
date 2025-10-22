module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true,
    'react-native/react-native': true, // Add React Native environment
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended', // Add import plugin extends
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  plugins: [
    'react',
    'react-native',
    'unused-imports',
    'import',
  ],
  rules: {
    // Turn off problematic rules
    'no-unused-vars': 'off',
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
      },
    ],
    
    // React rules
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    
    // Console statements - off for development, warn for production
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    
    // React Native rules
    'react-native/no-unused-styles': 'error',
    'react-native/split-platform-components': 'error',
    'react-native/no-inline-styles': 'warn',
    'react-native/no-color-literals': 'warn',
    'react-native/no-raw-text': 'off', // Allow raw text in React Native
    
    // Import rules - enforce empty lines between import groups
    'import/order': 'off', // Disabled to avoid repetitive warnings
    'import/no-unresolved': 'off', // Turn off for React Native
    'import/extensions': 'off', // Turn off for React Native
    'import/namespace': 'off', // Turn off to prevent react-native parse errors
    'import/named': 'off', // Turn off to prevent expo-camera false positives
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  globals: {
    __DEV__: 'readonly', // Define __DEV__ as a global variable
    document: 'readonly', // Define document as readonly (for web compatibility)
    window: 'readonly', // Define window as readonly (for web compatibility)
    navigator: 'readonly', // Define navigator as readonly
    fetch: 'readonly', // Define fetch as readonly
    FormData: 'readonly', // Define FormData as readonly
    XMLHttpRequest: 'readonly', // Define XMLHttpRequest as readonly
  },
  // Ignore problematic files and directories
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.expo/',
    'android/',
    'ios/',
    '*.config.js',
    'babel.config.js',
    'metro.config.js',
    'scripts/',
    'public/',
    'fix-build.js',
    'debug-test.js',
    'test-location-fix.js',
    '**/*.d.ts', // Ignore TypeScript declaration files
  ],
};
