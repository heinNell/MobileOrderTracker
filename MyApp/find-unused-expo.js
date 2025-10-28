const fs = require('fs');
const path = require('path');
const glob = require('glob');

const PROJECT_ROOT = process.cwd();
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'android', 'ios', '.expo'];

// Files that are ALWAYS considered used in Expo Router
const ALWAYS_USED = [
  /app\/_layout\.(js|jsx|ts|tsx)$/,
  /app\/index\.(js|jsx|ts|tsx)$/,
  /app\/\([\w-]+\)\/_layout\.(js|jsx|ts|tsx)$/,
  /app\/\([\w-]+\)\/\[\w+\]\.(js|jsx|ts|tsx)$/,  // Dynamic routes
  /\+not-found\.(js|jsx|ts|tsx)$/,
  /\+html\.(js|jsx|ts|tsx)$/,
  /\.(native|web|ios|android)\.(js|jsx|ts|tsx)$/,  // Platform files
  /\.config\.(js|ts)$/,
  /^(babel|metro|next)\.config\.js$/
];

function isAlwaysUsed(filePath) {
  const basename = path.basename(filePath);
  const relative = path.relative(PROJECT_ROOT, filePath);
  return ALWAYS_USED.some(pattern => 
    pattern.test(basename) || pattern.test(relative)
  );
}

function findAllImportsAndReferences() {
  const references = new Set();
  const files = glob.sync(`${PROJECT_ROOT}/**/*.{js,jsx,ts,tsx}`, {
    ignore: IGNORE_DIRS.map(dir => `**/${dir}/**`)
  });

  console.log(`📂 Scanning ${files.length} files...\n`);

  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      const patterns = [
        /import\s+.*\s+from\s+['"](.+)['"]/g,
        /require\(['"](.+)['"]\)/g,
        /import\s+['"](.+)['"]/g,
        /export\s+.*\s+from\s+['"](.+)['"]/g,
        /import\((['"])(.+)\1\)/g,
      ];

      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const importPath = match[1] || match[2];
          
          if (importPath?.startsWith('.')) {
            const cleanPath = importPath.split('?')[0].split('#')[0];
            const extensions = ['', '.js', '.jsx', '.ts', '.tsx'];
            const variants = [
              cleanPath,
              ...extensions.map(ext => cleanPath + ext),
              ...extensions.map(ext => path.join(cleanPath, 'index' + ext))
            ];

            variants.forEach(variant => {
              const resolved = path.resolve(path.dirname(file), variant);
              if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
                references.add(resolved);
              }
            });
          }
        }
      });
    } catch (error) {
      // Ignore errors
    }
  });

  return references;
}

const referencedFiles = findAllImportsAndReferences();
const allFiles = glob.sync(`${PROJECT_ROOT}/**/*.{js,jsx,ts,tsx}`, {
  ignore: [...IGNORE_DIRS.map(dir => `**/${dir}/**`), '**/*.d.ts']
});

const unusedFiles = allFiles.filter(file => 
  !referencedFiles.has(file) && !isAlwaysUsed(file)
);

console.log('📊 Analysis Results\n');
console.log(`✅ Total files: ${allFiles.length}`);
console.log(`🔗 Referenced: ${referencedFiles.size}`);
console.log(`🛡️  Protected (routes/config): ${allFiles.filter(isAlwaysUsed).length}`);
console.log(`⚠️  Potentially unused: ${unusedFiles.length}\n`);

if (unusedFiles.length > 0) {
  const categories = {
    'Debug/Test Files': unusedFiles.filter(f => 
      /test|debug|diagnostic|suite/i.test(f)
    ),
    'Scripts': unusedFiles.filter(f => f.includes('/scripts/')),
    'Components': unusedFiles.filter(f => f.includes('/components/')),
    'Utils': unusedFiles.filter(f => f.includes('/utils/')),
    'Other': []
  };

  categories.Other = unusedFiles.filter(f => 
    !Object.entries(categories)
      .filter(([k]) => k !== 'Other')
      .some(([_, files]) => files.includes(f))
  );

  Object.entries(categories).forEach(([category, files]) => {
    if (files.length > 0) {
      console.log(`\n${category}:`);
      files.forEach(f => {
        const size = (fs.statSync(f).size / 1024).toFixed(1);
        console.log(`  • ${path.relative(PROJECT_ROOT, f)} (${size} KB)`);
      });
    }
  });
}
