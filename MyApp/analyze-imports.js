const fs = require('fs');
const path = require('path');
const glob = require('glob');

const PROJECT_ROOT = process.cwd();
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'android', 'ios', '.expo'];

// Build a complete dependency graph
function buildDependencyGraph() {
  const graph = new Map(); // file -> Set of files it imports
  const reverseGraph = new Map(); // file -> Set of files that import it
  
  const files = glob.sync(`${PROJECT_ROOT}/**/*.{js,jsx,ts,tsx}`, {
    ignore: IGNORE_DIRS.map(dir => `**/${dir}/**`)
  });

  console.log(`🔍 Analyzing ${files.length} files...\n`);

  files.forEach(file => {
    graph.set(file, new Set());
    
    try {
      const content = fs.readFileSync(file, 'utf8');
      const imports = new Set();
      
      // Extract all imports
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

            for (const variant of variants) {
              const resolved = path.resolve(path.dirname(file), variant);
              if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
                imports.add(resolved);
                break;
              }
            }
          }
        }
      });

      imports.forEach(imp => {
        graph.get(file).add(imp);
        if (!reverseGraph.has(imp)) {
          reverseGraph.set(imp, new Set());
        }
        reverseGraph.get(imp).add(file);
      });

    } catch (error) {
      // Ignore errors
    }
  });

  return { graph, reverseGraph, allFiles: files };
}

// Find entry points (routes, layouts, config files)
function findEntryPoints(allFiles) {
  const entryPatterns = [
    /app\/_layout\.(js|jsx|ts|tsx)$/,
    /app\/index\.(js|jsx|ts|tsx)$/,
    /app\/\([\w-]+\)\/_layout\.(js|jsx|ts|tsx)$/,
    /app\/\([\w-]+\)\/[^/]+\.(js|jsx|ts|tsx)$/,  // Route files
    /\.(config|setup)\.(js|ts)$/,
  ];

  return allFiles.filter(file => 
    entryPatterns.some(pattern => pattern.test(file))
  );
}

// Find all reachable files from entry points
function findReachableFiles(entryPoints, graph) {
  const reachable = new Set();
  const queue = [...entryPoints];
  
  while (queue.length > 0) {
    const file = queue.shift();
    if (reachable.has(file)) continue;
    
    reachable.add(file);
    const imports = graph.get(file) || new Set();
    imports.forEach(imp => {
      if (!reachable.has(imp)) {
        queue.push(imp);
      }
    });
  }
  
  return reachable;
}

// Main analysis
const { graph, reverseGraph, allFiles } = buildDependencyGraph();
const entryPoints = findEntryPoints(allFiles);
const reachableFiles = findReachableFiles(entryPoints, graph);

console.log('📊 Dependency Analysis\n');
console.log(`Entry Points: ${entryPoints.length}`);
entryPoints.forEach(ep => {
  console.log(`  • ${path.relative(PROJECT_ROOT, ep)}`);
});

console.log(`\n✅ Reachable from entry points: ${reachableFiles.size}`);
console.log(`❌ Unreachable (truly unused): ${allFiles.length - reachableFiles.size}\n`);

// Show unreachable files
const unreachable = allFiles.filter(f => !reachableFiles.has(f));

if (unreachable.length > 0) {
  console.log('🗑️  Files NOT reachable from any entry point:\n');
  
  const categories = {
    'Components': unreachable.filter(f => f.includes('/components/')),
    'Utils': unreachable.filter(f => f.includes('/utils/')),
    'Services': unreachable.filter(f => f.includes('/services/')),
    'Hooks': unreachable.filter(f => f.includes('/hooks/')),
    'Lib': unreachable.filter(f => f.includes('/lib/')),
    'Shared': unreachable.filter(f => f.includes('/shared/')),
    'Scripts': unreachable.filter(f => f.includes('/scripts/') || f.includes('scripts')),
    'Root': unreachable.filter(f => !f.includes('/app/') && !f.includes('/scripts/')),
    'Other': []
  };

  categories.Other = unreachable.filter(f => 
    !Object.entries(categories)
      .filter(([k]) => k !== 'Other')
      .some(([_, files]) => files.includes(f))
  );

  Object.entries(categories).forEach(([category, files]) => {
    if (files.length > 0) {
      console.log(`${category}:`);
      files.forEach(f => {
        const size = (fs.statSync(f).size / 1024).toFixed(1);
        const importedBy = reverseGraph.get(f) || new Set();
        const imports = graph.get(f) || new Set();
        
        console.log(`  • ${path.relative(PROJECT_ROOT, f)} (${size} KB)`);
        if (importedBy.size > 0) {
          console.log(`    ⚠️  Imported by ${importedBy.size} file(s) (but not reachable from entry):`);
          Array.from(importedBy).slice(0, 3).forEach(imp => {
            console.log(`      - ${path.relative(PROJECT_ROOT, imp)}`);
          });
        }
      });
      console.log('');
    }
  });
}

// Show import chains for specific files
console.log('\n🔗 Sample Import Chains:\n');

const interestingFiles = [
  'app/components/ui/QuickStatCard.js',
  'app/components/map/MapComponentLoader.js',
  'app/hooks/useLocation.js',
  'app/lib/storage.js',
].map(f => path.join(PROJECT_ROOT, f)).filter(f => fs.existsSync(f));

interestingFiles.forEach(file => {
  console.log(`${path.relative(PROJECT_ROOT, file)}:`);
  const importedBy = reverseGraph.get(file) || new Set();
  
  if (importedBy.size === 0) {
    console.log('  ❌ Not imported by any file\n');
  } else {
    console.log(`  ✅ Imported by ${importedBy.size} file(s):`);
    Array.from(importedBy).forEach(imp => {
      const isReachable = reachableFiles.has(imp);
      const icon = isReachable ? '✅' : '❌';
      console.log(`    ${icon} ${path.relative(PROJECT_ROOT, imp)}`);
    });
    console.log('');
  }
});

// Save detailed report
const report = {
  summary: {
    totalFiles: allFiles.length,
    entryPoints: entryPoints.length,
    reachable: reachableFiles.size,
    unreachable: unreachable.length
  },
  entryPoints: entryPoints.map(f => path.relative(PROJECT_ROOT, f)),
  unreachableFiles: unreachable.map(f => ({
    path: path.relative(PROJECT_ROOT, f),
    size: fs.statSync(f).size,
    importedBy: Array.from(reverseGraph.get(f) || []).map(i => path.relative(PROJECT_ROOT, i)),
    imports: Array.from(graph.get(f) || []).map(i => path.relative(PROJECT_ROOT, i))
  }))
};

fs.writeFileSync('dependency-analysis.json', JSON.stringify(report, null, 2));
console.log('💾 Detailed report saved to: dependency-analysis.json\n');

