#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('🎨 Advanced style checking...\n');

function analyzeStyles(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const styleMatch = content.match(/const\s+styles\s*=\s*StyleSheet\.create\(\{([\s\S]*?)\}\);?/);
    
    if (!styleMatch) return { unused: [], shadowOffsets: [] };
    
    const styleContent = styleMatch[1];
    const styleNames = [];
    const shadowOffsets = [];
    
    // Extract style names
    const styleRegex = /(\w+):\s*\{([\s\S]*?)\}/g;
    let match;
    
    while ((match = styleRegex.exec(styleContent)) !== null) {
      const styleName = match[1];
      const styleBody = match[2];
      
      styleNames.push(styleName);
      
      // Check if this style contains shadowOffset
      if (styleBody.includes('shadowOffset')) {
        shadowOffsets.push(styleName);
      }
    }
    
    // Check usage (excluding shadowOffset styles)
    const unused = styleNames.filter(styleName => {
      if (shadowOffsets.includes(styleName)) return false; // Skip shadow styles
      
      const patterns = [
        `styles.${styleName}`,
        `styles\
$$
['"]${styleName}['"]\
$$
`,
        `style={styles.${styleName}}`,
        `style={\
$$
.*styles.${styleName}.*\
$$
}`,
      ];
      
      const combinedPattern = patterns.join('|');
      const regex = new RegExp(combinedPattern, 'g');
      const matches = content.match(regex) || [];
      
      return matches.length < 1;
    });
    
    return { unused, shadowOffsets };
  } catch (error) {
    return { unused: [], shadowOffsets: [] };
  }
}

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return { unused: [], shadowStyles: 0 };
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  let totalUnused = [];
  let totalShadowStyles = 0;
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory() && !['node_modules', '.expo', '.git'].includes(item.name)) {
      const result = scanDirectory(fullPath);
      totalUnused = totalUnused.concat(result.unused);
      totalShadowStyles += result.shadowStyles;
    } else if (/\.(js|jsx|tsx)$/.test(item.name)) {
      const { unused, shadowOffsets } = analyzeStyles(fullPath);
      if (unused.length > 0) {
        totalUnused.push({ file: fullPath, styles: unused });
      }
      totalShadowStyles += shadowOffsets.length;
    }
  }
  
  return { unused: totalUnused, shadowStyles: totalShadowStyles };
}

const { unused, shadowStyles } = scanDirectory('./app');

if (unused.length === 0) {
  console.log('✅ No unused styles found!');
} else {
  console.log('⚠️  Potentially unused styles:\n');
  unused.forEach(({ file, styles }) => {
    console.log(`📄 ${file}`);
    styles.forEach(style => console.log(`   • ${style}`));
    console.log('');
  });
  console.log(`📊 Total: ${unused.reduce((sum, r) => sum + r.styles.length, 0)} potentially unused styles`);
}

console.log(`🌟 Found ${shadowStyles} shadow-related styles (automatically excluded from unused check)`);
console.log('\n💡 Shadow styles (shadowOffset, etc.) are typically used within style objects and excluded from this check.\n');
