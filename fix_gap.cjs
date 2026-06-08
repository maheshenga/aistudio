const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src/components');
files.push('./src/App.tsx');
let count = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('gap-[var(--spacing-lg)]')) {
    content = content.replace(/gap-\[var\(--spacing-lg\)]/g, 'gap-[var(--spacing-md)]');
    fs.writeFileSync(file, content, 'utf8');
    count++;
  }
}
console.log(`Updated gap to spacing-md in ${count} files.`);

// Also remove -ml-* and -mt-* where they were used for layout
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let updated = false;
  
  if (content.includes('-ml-4')) {
    // Specifically target `<div className="w-full h-[260px] -ml-4">` in StoreDashboardView
    content = content.replace(/-ml-4/g, ''); 
    updated = true;
  }
  
  if (content.includes('-mt-10')) {
    content = content.replace(/-mt-10/g, '');
    updated = true;
  }

  // Find occurrences of mb-[var(--spacing-lg)] following a grid if you want to standardize margin-bottom as well.
  if (content.includes('mb-[var(--spacing-lg)]')) {
    content = content.replace(/mb-\[var\(--spacing-lg\)]/g, 'mb-[var(--spacing-md)]');
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated margins in ${file}`);
  }
}
