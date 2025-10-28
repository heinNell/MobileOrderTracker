const fs = require('fs');
const path = require('path');
const glob = require('glob');

const PROJECT_ROOT = process.cwd();
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'android', 'ios', '.expo'];

console.log('🔍 Finding where unreachable files SHOULD be imported...\n');

// Files we know are unreachable but might be intended for use
const suspiciousFiles = {
  'QuickStatCard': 'app/components/ui/QuickStatCard.js',
  'ErrorBoundary': 'app/components/ui/ErrorBoundary.js',
  'EnhancedStatusPicker': 'app/components/order/EnhancedStatusPicker.js',
  'MapComponentLoader': 'app/components/map/MapComponentLoader.js',
  'useLocation': 'app/hooks/useLocation.js',
  'storage': 'app/lib/storage.js',
  'notificationService': 'app/services/notificationService.js',
  'types': 'app/shared/types.js',
};

// Find all reachable files
const reachableFiles = [
  'app/_layout.js',
  'app/(tabs)/_layout.js',
  'app/(tabs)/index.js',
  'app/(tabs)/orders.js',
  'app/(tabs)/profile.js',
  'app/(tabs)/[orderId].js',
  'app/(tabs)/LoadActivationScreen.js',
  'app/(tabs)/DriverDashboard.js',
  'app/(auth)/_layout.js',
  'app/(auth)/login.js',
  'app/(auth)/register.js',
  'app/components/order/StatusUpdateButtons.js',
  'app/components/order/OrderProgressTimeline.js',
  'app/components/map/MapView.js',
  'app/components/auth/LogoutButton.js',
  'app/services/LocationService.js',
  'app/services/WebLocationService.js',
  'app/services/StatusUpdateService.js',
  'app/services/GeocodingService.js',
  'app/context/AuthContext.js',
  'app/lib/supabase.js',
].map(f => path.join(PROJECT_ROOT, f));

console.log('📋 Analyzing reachable files for potential use cases...\n');

// Check each reachable file
reachableFiles.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  const findings = [];
  
  // 1. Check for inline definitions that could use external components
  if (content.includes('const QuickStatCard') || content.includes('function QuickStatCard')) {
    findings.push({
      issue: '🔄 QuickStatCard defined INLINE',
      suggestion: `Could import from: ${suspiciousFiles.QuickStatCard}`,
      line: getLineNumber(content, 'QuickStatCard')
    });
  }
  
  // 2. Check for error handling without ErrorBoundary
  if (content.includes('try {') && content.includes('catch') && !content.includes('ErrorBoundary')) {
    findings.push({
      issue: '⚠️  Has error handling but no ErrorBoundary',
      suggestion: `Consider wrapping with: ${suspiciousFiles.ErrorBoundary}`,
      line: getLineNumber(content, 'try {')
    });
  }
  
  // 3. Check for status pickers
  if ((content.includes('Picker') || content.includes('status')) && 
      content.includes('onChange') && 
      !content.includes('EnhancedStatusPicker')) {
    findings.push({
      issue: '📋 Custom status picker implementation',
      suggestion: `Could use: ${suspiciousFiles.EnhancedStatusPicker}`,
      line: getLineNumber(content, 'Picker')
    });
  }
  
  // 4. Check for direct map component usage
  if (content.includes('MapView') && !content.includes('MapComponentLoader')) {
    findings.push({
      issue: '🗺️  Using MapView directly',
      suggestion: `Consider lazy loading with: ${suspiciousFiles.MapComponentLoader}`,
      line: getLineNumber(content, 'MapView')
    });
  }
  
  // 5. Check for location tracking
  if ((content.includes('location') || content.includes('Location')) && 
      content.includes('watchPosition') && 
      !content.includes('useLocation')) {
    findings.push({
      issue: '📍 Custom location tracking',
      suggestion: `Could use hook: ${suspiciousFiles.useLocation}`,
      line: getLineNumber(content, 'watchPosition')
    });
  }
  
  // 6. Check for AsyncStorage direct usage when storage wrapper exists
  if (content.includes('AsyncStorage') && !content.includes('from.*storage')) {
    findings.push({
      issue: '💾 Using AsyncStorage directly',
      suggestion: `Could use wrapper: ${suspiciousFiles.storage}`,
      line: getLineNumber(content, 'AsyncStorage')
    });
  }
  
  // 7. Check for notification handling
  if ((content.includes('notification') || content.includes('Notification')) && 
      !content.includes('notificationService')) {
    findings.push({
      issue: '🔔 Notification code without service',
      suggestion: `Could use: ${suspiciousFiles.notificationService}`,
      line: getLineNumber(content, 'notification')
    });
  }
  
  // 8. Check for type definitions
  if ((content.includes('PropTypes') || content.includes(': {')) && 
      !content.includes('from.*types')) {
    findings.push({
      issue: '📝 No shared type definitions',
      suggestion: `Could use: ${suspiciousFiles.types}`,
      line: null
    });
  }
  
  if (findings.length > 0) {
    console.log(`📄 ${relativePath}`);
    findings.forEach(f => {
      console.log(`   ${f.issue}`);
      console.log(`   💡 ${f.suggestion}`);
      if (f.line) console.log(`   📍 Line: ${f.line}`);
      console.log('');
    });
  }
});

function getLineNumber(content, searchTerm) {
  const lines = content.split('\n');
  const lineIndex = lines.findIndex(line => line.includes(searchTerm));
  return lineIndex >= 0 ? lineIndex + 1 : null;
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Now let's check what the unused components actually do
console.log('🔍 What do these unused files actually provide?\n');

const componentsToAnalyze = [
  'app/components/ui/QuickStatCard.js',
  'app/components/ui/ErrorBoundary.js',
  'app/components/order/EnhancedStatusPicker.js',
  'app/components/map/MapComponentLoader.js',
  'app/hooks/useLocation.js',
  'app/lib/storage.js',
  'app/services/notificationService.js',
];

componentsToAnalyze.forEach(file => {
  const filePath = path.join(PROJECT_ROOT, file);
  if (!fs.existsSync(filePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  console.log(`📦 ${file}`);
  
  // Extract exports
  const exports = lines.filter(line => 
    line.includes('export') && !line.trim().startsWith('//')
  ).slice(0, 3);
  
  if (exports.length > 0) {
    console.log('   Exports:');
    exports.forEach(exp => {
      console.log(`     • ${exp.trim()}`);
    });
  }
  
  // Extract props/interface
  const propsMatch = content.match(/\{([^}]+)\}\s*\)/);
  if (propsMatch) {
    console.log(`   Props: ${propsMatch[1].trim()}`);
  }
  
  // Extract main functionality
  const functions = lines.filter(line => 
    (line.includes('function ') || line.includes('const ') && line.includes('=>')) &&
    !line.trim().startsWith('//')
  ).slice(0, 2);
  
  if (functions.length > 0) {
    console.log('   Functions:');
    functions.forEach(func => {
      console.log(`     • ${func.trim().substring(0, 60)}...`);
    });
  }
  
  console.log('');
});

