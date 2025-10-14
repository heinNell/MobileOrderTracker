// scripts/validate-codebase.js
const { execSync } = require('child_process');

console.log('🔍 Starting codebase validation...\n');

try {
  // Check for unused files
  console.log('Checking for unused files...');
  execSync('node scripts/check-unused-files.js', { stdio: 'inherit' });
  console.log('\n');

  // Check for unused dependencies
  console.log('Checking for unused dependencies...');
  execSync('npx depcheck', { stdio: 'inherit' });
  console.log('\n');

  // Run ESLint
  console.log('Running ESLint...');
  execSync('npx eslint . --ext .js,.jsx,.ts,.tsx', { stdio: 'inherit' });
  console.log('\n');

  // Check TypeScript if configured
  if (fs.existsSync('tsconfig.json')) {
    console.log('Running TypeScript checks...');
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
    console.log('\n');
  }

  console.log('✅ Validation complete!');
} catch (error) {
  console.error('❌ Validation failed:', error.message);
  process.exit(1);
}
