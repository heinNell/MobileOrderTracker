#!/usr/bin/env node
const { execSync } = require('child_process');

console.log('🔍 Checking dependencies...\n');

try {
  console.log('Checking for missing dependencies...');
  execSync('npm ls --depth=0', { stdio: 'inherit' });
  console.log('\n✅ All dependencies are installed correctly!\n');
} catch (error) {
  console.log('\n⚠️  Some dependency issues found. Run "npm install" to fix.\n');
}

console.log('Checking for outdated packages...');
try {
  execSync('npm outdated', { stdio: 'inherit' });
  console.log('\n✅ All packages are up to date!\n');
} catch (error) {
  console.log('\n💡 Some packages are outdated. Run "npm update" or "npm run update-deps"\n');
}
