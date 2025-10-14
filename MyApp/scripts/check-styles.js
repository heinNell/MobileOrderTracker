#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('🎨 Checking for unused styles in React Native components...\n');

function findUnusedStyles(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const styleMatch = content.match(/StyleSheet\.create\(\{([\s\S]*?)\}\);?/);
    
    if (!styleMatch) return [];
    
    const styleNames = [];
    const styleRegex = /(\w+):\s*\{/g;
    let match;
    
    while ((match = styleRegex.exec(styleMatch[1])) !== null) {
      styleNames.push(match[1]);
    }
    
    const unusedStyles = styleNames.filter(styleName => {
      // More comprehensive usage patterns
      const patterns = [
        `styles.${styleName}`,           // styles.container
        `styles\
$$
['"]${styleName}['"]\
$$
`, // styles['container']
        `style={styles.${styleName}}`,   // style={styles.container}
        `style={\
$$
.*styles.${styleName}.*\
$$
}`, // style={[styles.container, ...]}
        `...styles.${styleName}`,        // ...styles.container
      ];
      
      const combinedPattern = patterns.join('|');
      const regex = new RegExp(combinedPattern, 'g');
      const matches = content.match(regex) || [];
      
      // If found less than 2 times (definition + usage), it might be unused
      return matches.length < 1;
    });
    
    return unusedStyles;
  } catch (error) {
    return [];
  }
}

function scanDirectory(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory() && !['node_modules', '.expo', '.git', 'components'].includes(item.name)) {
      scanDirectory(fullPath, results);
    } else if (/\.(js|jsx|tsx)$/.test(item.name)) {
      const unused = findUnusedStyles(fullPath);
      if (unused.length > 0) {
        results.push({ file: fullPath, styles: unused });
      }
    }
  }
  
  return results;
}

const results = scanDirectory('./app');

if (results.length === 0) {
  console.log('✅ No unused styles found!\n');
} else {
  console.log('⚠️  Potentially unused styles:\n');
  console.log('ℹ️  Note: This is a basic check. Manual review recommended.\n');
  
  results.forEach(({ file, styles }) => {
    console.log(`📄 ${file}`);
    styles.forEach(style => console.log(`   • ${style}`));
    console.log('');
  });
  console.log(`📊 Total: ${results.reduce((sum, r) => sum + r.styles.length, 0)} potentially unused styles\n`);
}

console.log('💡 To manually verify, search for each style name in your code editor.\n');
