#!/usr/bin/env node
const { execSync } = require('child_process');

console.log('🚀 Running Full Validation Suite\n');
console.log('='.repeat(50) + '\n');

const checks = [
  { name: '🎨 Style Check', cmd: 'npm run check-styles' },
  { name: '📦 Dependency Check', cmd: 'npm run check-deps' },
  { name: '🔍 Lint Check', cmd: 'npm run lint' },
];

let allPassed = true;
const results = [];

for (const check of checks) {
  console.log(`Running ${check.name}...`);
  console.log('-'.repeat(50));
  
  try {
    execSync(check.cmd, { stdio: 'inherit' });
    results.push({ name: check.name, passed: true });
    console.log(`\n✅ ${check.name} passed!\n`);
  } catch (error) {
    results.push({ name: check.name, passed: false });
    allPassed = false;
    console.log(`\n❌ ${check.name} failed!\n`);
  }
}

console.log('='.repeat(50));
console.log('\n📊 Validation Summary:\n');

results.forEach(({ name, passed }) => {
  console.log(`${passed ? '✅' : '❌'} ${name}`);
});

console.log('\n' + '='.repeat(50) + '\n');

if (allPassed) {
  console.log('🎉 All validations passed! Code is ready.\n');
  process.exit(0);
} else {
  console.log('⚠️  Some validations failed. Please fix the issues above.\n');
  process.exit(1);
}
