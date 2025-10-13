// App.js - Minimal export for expo-router
import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// Must be exported from the main component
export default function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
