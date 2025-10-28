const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const PROJECT_ROOT = process.cwd();
const IGNORE_DIRS = [
  'node_modules', 
  '.git', 
  '.github', 
  'dist', 
  'build', 
  'coverage',
  'android',
  'ios',
  '.expo',
  '.vercel',
  'assets',
  'public'
];

function findAllImportsAndReferences() {
  const references = new Set();

  // Find all JavaScript/TypeScript files
  const files = glob.sync(`${PROJECT_ROOT}/**/*.{js,jsx,ts,tsx}`, {
    ignore: IGNORE_DIRS.map(dir => `**/${dir}/**`)
  });

  console.log(`📂 Scanning ${files.length} files for imports...`);

  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Enhanced regex patterns for various import and reference styles
      const patterns = [
        // Standard imports
        /import\s+.*\s+from\s+['"](.+)['"]/g,
        /require\(['"](.+)['"]\)/g,
        /import\s+['"](.+)['"]/g,
        /from\s+['"](.+)['"]/g,
        // Dynamic imports
        /import\((['"])(.+)\1\)/g,
        // Export from
        /export\s+.*\s+from\s+['"](.+)['"]/g,
        // JSX/TSX file references (e.g., in Expo Router)
        /<Link\s+href=['"](.+)['"]/g,
        /router\.push\(['"](.+)['"]/g,
      ];

      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const importPath = match[1] || match[2];
          
          // Handle relative imports and app/ paths
          if (importPath && (importPath.startsWith('.') || importPath.startsWith('app/') || importPath.startsWith('/'))) {
            // Remove query params and hash
            const cleanPath = importPath.split('?')[0].split('#')[0];
            
            const resolvedPaths = [
              path.resolve(path.dirname(file), cleanPath),
              path.resolve(path.dirname(file), cleanPath + '.js'),
              path.resolve(path.dirname(file), cleanPath + '.jsx'),
              path.resolve(path.dirname(file), cleanPath + '.ts'),
              path.resolve(path.dirname(file), cleanPath + '.tsx'),
              path.resolve(path.dirname(file), cleanPath, 'index.js'),
              path.resolve(path.dirname(file), cleanPath, 'index.jsx'),
              path.resolve(path.dirname(file), cleanPath, 'index.ts'),
              path.resolve(path.dirname(file), cleanPath, 'index.tsx'),
              // Handle app/ routes
              path.resolve(PROJECT_ROOT, cleanPath + '.js'),
              path.resolve(PROJECT_ROOT, cleanPath + '.jsx'),
              path.resolve(PROJECT_ROOT, cleanPath + '.ts'),
              path.resolve(PROJECT_ROOT, cleanPath + '.tsx'),
            ];

            resolvedPaths.forEach(p => {
              if (fs.existsSync(p) && fs.statSync(p).isFile()) {
                references.add(p);
              }
            });
          }
        }
      });
    } catch (error) {
      console.error(`❌ Error processing file ${file}:`, error.message);
    }
  });

  return references;
}

function findPotentiallyUnusedFiles() {
  console.log('🔍 Searching for potentially unused files...\n');

  // Find all references
  const referencedFiles = findAllImportsAndReferences();
  console.log(`✅ Found ${referencedFiles.size} referenced files\n`);

  // Get all JS/TS files in the project
  const allFiles = glob.sync(`${PROJECT_ROOT}/**/*.{js,jsx,ts,tsx}`, {
    ignore: [
      ...IGNORE_DIRS.map(dir => `**/${dir}/**`),
      '**/*.d.ts',
      '**/*.test.{js,jsx,ts,tsx}',
      '**/*.spec.{js,jsx,ts,tsx}'
    ]
  });

  // Filter out referenced files and apply additional checks
  const unusedFiles = allFiles.filter(file => {
    // Always keep certain critical files
    const criticalPatterns = [
      // Entry points
      /\/_layout\.(js|jsx|ts|tsx)$/,
      /\/index\.(js|jsx|ts|tsx)$/,
      /^app\.config\.(js|ts)$/,
      /^babel\.config\.js$/,
      /^metro\.config\.js$/,
      // Root files
      /^package\.json$/,
      // Expo Router special files
      /\+html\.(js|jsx|ts|tsx)$/,
      /\+not-found\.(js|jsx|ts|tsx)$/,
    ];

    if (criticalPatterns.some(pattern => pattern.test(path.basename(file)))) {
      return false;
    }

    // Check if file is referenced
    return !referencedFiles.has(file);
  });

  console.log('📊 Potentially Unused Files Report');
  console.log('===================================\n');

  if (unusedFiles.length === 0) {
    console.log('✅ No unused files found!');
    return [];
  }

  // Categorize files
  const categorizedFiles = {
    components: unusedFiles.filter(f => f.includes('/components/')),
    screens: unusedFiles.filter(f => f.includes('/screens/')),
    routes: unusedFiles.filter(f => f.includes('/(auth)') || f.includes('/(tabs)')),
    utils: unusedFiles.filter(f => f.includes('/utils/')),
    services: unusedFiles.filter(f => f.includes('/services/')),
    hooks: unusedFiles.filter(f => f.includes('/hooks/')),
    config: unusedFiles.filter(f => f.includes('/config/')),
    other: []
  };

  // Add files that don't match any category to 'other'
  categorizedFiles.other = unusedFiles.filter(f => 
    !Object.entries(categorizedFiles)
      .filter(([key]) => key !== 'other')
      .some(([_, files]) => files.includes(f))
  );

  console.log('📁 File Category Breakdown:\n');
  Object.entries(categorizedFiles).forEach(([category, files]) => {
    if (files.length > 0) {
      console.log(`${category.toUpperCase()} (${files.length} files):`);
      files.forEach(f => {
        const relativePath = path.relative(PROJECT_ROOT, f);
        const fileSize = fs.statSync(f).size;
        const sizeKB = (fileSize / 1024).toFixed(1);
        console.log(`  • ${relativePath} (${sizeKB} KB)`);
      });
      console.log('');
    }
  });

  // Calculate total size
  const totalSize = unusedFiles.reduce((sum, f) => sum + fs.statSync(f).size, 0);
  const totalSizeKB = (totalSize / 1024).toFixed(1);

  console.log('📈 Summary:');
  console.log(`  Total unused files: ${unusedFiles.length}`);
  console.log(`  Total size: ${totalSizeKB} KB`);
  console.log('\n⚠️  Note: Review these files carefully before deleting!');
  console.log('   Some files may be used dynamically or in ways not detected by static analysis.');

  return unusedFiles;
}

// Run the check
const unusedFiles = findPotentiallyUnusedFiles();

// Optional: Generate a JSON report
const reportPath = path.join(PROJECT_ROOT, 'unused-files-report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  totalUnused: unusedFiles.length,
  files: unusedFiles.map(f => ({
    path: path.relative(PROJECT_ROOT, f),
    size: fs.statSync(f).size
  }))
}, null, 2));

console.log(`\n💾 Detailed report saved to: ${reportPath}`);
