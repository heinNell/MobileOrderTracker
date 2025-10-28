const fs = require('fs');

console.log('🔍 DETAILED COMPONENT COMPARISON\n');
console.log('═══════════════════════════════════════════════════════════\n');

// Compare Status Pickers
console.log('📋 STATUS PICKER COMPARISON\n');

const statusButtons = fs.readFileSync('app/components/order/StatusUpdateButtons.js', 'utf8');
const enhancedPicker = fs.readFileSync('app/components/order/EnhancedStatusPicker.js', 'utf8');

console.log('CURRENT: StatusUpdateButtons.js');
console.log('─────────────────────────────────');

// Extract key features
const buttonsFeatures = {
  hasDropdown: statusButtons.includes('Picker') || statusButtons.includes('select'),
  hasButtons: statusButtons.includes('TouchableOpacity') || statusButtons.includes('Pressable'),
  hasAnimation: statusButtons.includes('Animated') || statusButtons.includes('animation'),
  hasValidation: statusButtons.includes('canTransition') || statusButtons.includes('validate'),
  hasColors: statusButtons.includes('getStatusColor'),
  hasIcons: statusButtons.includes('Icon') || statusButtons.includes('icon'),
  dependencies: (statusButtons.match(/import.*from/g) || []).length
};

console.log('Features:');
Object.entries(buttonsFeatures).forEach(([key, value]) => {
  console.log(`  • ${key}: ${value}`);
});

console.log('\nKey Functions:');
const buttonsFunctions = statusButtons.match(/(?:const|function)\s+(\w+)\s*[=\(]/g) || [];
buttonsFunctions.slice(0, 8).forEach(f => console.log(`  • ${f.trim()}`));

console.log('\n\nUNUSED: EnhancedStatusPicker.js');
console.log('─────────────────────────────────');

const enhancedFeatures = {
  hasDropdown: enhancedPicker.includes('Picker') || enhancedPicker.includes('select'),
  hasButtons: enhancedPicker.includes('TouchableOpacity') || enhancedPicker.includes('Pressable'),
  hasAnimation: enhancedPicker.includes('Animated') || enhancedPicker.includes('animation'),
  hasValidation: enhancedPicker.includes('canTransition') || enhancedPicker.includes('validate'),
  hasColors: enhancedPicker.includes('getStatusColor'),
  hasIcons: enhancedPicker.includes('Icon') || enhancedPicker.includes('icon'),
  dependencies: (enhancedPicker.match(/import.*from/g) || []).length
};

console.log('Features:');
Object.entries(enhancedFeatures).forEach(([key, value]) => {
  console.log(`  • ${key}: ${value}`);
});

console.log('\nKey Functions:');
const enhancedFunctions = enhancedPicker.match(/(?:const|function)\s+(\w+)\s*[=\(]/g) || [];
enhancedFunctions.slice(0, 8).forEach(f => console.log(`  • ${f.trim()}`));

console.log('\n\n📊 COMPARISON RESULT:');
console.log('─────────────────────────────────');
if (buttonsFeatures.hasButtons && !enhancedFeatures.hasButtons) {
  console.log('✅ StatusUpdateButtons has button interface (better UX)');
} else if (!buttonsFeatures.hasButtons && enhancedFeatures.hasButtons) {
  console.log('✅ EnhancedStatusPicker has button interface (better UX)');
} else {
  console.log('⚖️  Both have similar interface');
}

if (buttonsFeatures.hasValidation && !enhancedFeatures.hasValidation) {
  console.log('✅ StatusUpdateButtons has validation logic');
} else if (!buttonsFeatures.hasValidation && enhancedFeatures.hasValidation) {
  console.log('✅ EnhancedStatusPicker has validation logic');
}

console.log(`\n�� Size: StatusUpdateButtons (${(statusButtons.length/1024).toFixed(1)}KB) vs EnhancedStatusPicker (${(enhancedPicker.length/1024).toFixed(1)}KB)`);

console.log('\n💡 RECOMMENDATION:');
if (buttonsFeatures.hasValidation || buttonsFeatures.dependencies > enhancedFeatures.dependencies) {
  console.log('   Keep StatusUpdateButtons (currently used, more features)');
  console.log('   Delete EnhancedStatusPicker');
} else {
  console.log('   Consider switching to EnhancedStatusPicker');
}

console.log('\n═══════════════════════════════════════════════════════════\n');

// Storage wrapper analysis
console.log('💾 STORAGE WRAPPER ANALYSIS\n');

const storage = fs.readFileSync('app/lib/storage.js', 'utf8');

console.log('storage.js provides:');
console.log('  • Cross-platform abstraction (Web + Native)');
console.log('  • Handles localStorage for web');
console.log('  • Falls back to AsyncStorage for native');

console.log('\n❓ Do you deploy to WEB?');
console.log('   ✅ YES → Keep storage.js and refactor all files to use it');
console.log('   ❌ NO  → Delete storage.js, AsyncStorage is fine');

console.log('\n═══════════════════════════════════════════════════════════\n');

// Check app.config for web
const appConfig = fs.readFileSync('app.config.js', 'utf8');
const hasWeb = appConfig.includes('web') || appConfig.includes('Web');

console.log('🌐 PLATFORM DETECTION\n');
console.log(`app.config.js includes web config: ${hasWeb}`);

const nextConfig = fs.existsSync('next.config.js');
console.log(`next.config.js exists: ${nextConfig}`);

if (hasWeb || nextConfig) {
  console.log('\n✅ PROJECT TARGETS WEB');
  console.log('   → KEEP storage.js wrapper');
  console.log('   → Refactor all AsyncStorage imports');
} else {
  console.log('\n❌ PROJECT DOES NOT TARGET WEB');
  console.log('   → DELETE storage.js wrapper');
  console.log('   → Keep AsyncStorage as-is');
}

console.log('\n═══════════════════════════════════════════════════════════\n');

