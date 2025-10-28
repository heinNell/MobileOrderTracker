const fs = require('fs');
const path = require('path');

const report = JSON.parse(fs.readFileSync('dependency-analysis.json', 'utf8'));

console.log('✅ REACHABLE FILES (28 files actually used):\n');

const data = JSON.parse(fs.readFileSync('dependency-analysis.json', 'utf8'));

// Get all files
const allReachable = data.summary.reachable;
const allUnreachable = data.unreachableFiles.map(f => f.path);
const totalFiles = data.summary.totalFiles;

// Calculate reachable by exclusion
const glob = require('glob');
const PROJECT_ROOT = process.cwd();
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'android', 'ios', '.expo'];

const allFiles = glob.sync(`${PROJECT_ROOT}/**/*.{js,jsx,ts,tsx}`, {
  ignore: IGNORE_DIRS.map(dir => `**/${dir}/**`)
}).map(f => path.relative(PROJECT_ROOT, f));

const unreachableSet = new Set(allUnreachable);
const reachableFiles = allFiles.filter(f => !unreachableSet.has(f));

console.log('Entry Points & Routes:');
reachableFiles.filter(f => f.includes('app/') && (f.includes('_layout') || f.match(/app\/\([^)]+\)\/[^/]+\.js/))).forEach(f => {
  console.log(`  ✅ ${f}`);
});

console.log('\nComponents:');
reachableFiles.filter(f => f.includes('app/components/')).forEach(f => {
  console.log(`  ✅ ${f}`);
});

console.log('\nServices:');
reachableFiles.filter(f => f.includes('app/services/')).forEach(f => {
  console.log(`  ✅ ${f}`);
});

console.log('\nContext/State:');
reachableFiles.filter(f => f.includes('app/context/')).forEach(f => {
  console.log(`  ✅ ${f}`);
});

console.log('\nUtils/Lib:');
reachableFiles.filter(f => f.includes('app/utils/') || f.includes('app/lib/')).forEach(f => {
  console.log(`  ✅ ${f}`);
});

console.log('\nConfig:');
reachableFiles.filter(f => !f.includes('app/')).forEach(f => {
  console.log(`  ✅ ${f}`);
});

