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
  let updated = false;

  // Global SVG icon replacements
  // w-3 h-3 -> icon-xs ?
  // w-4 h-4 -> icon-sm
  // w-5 h-5 -> icon-md
  // w-6 h-6 -> icon-lg
  // w-8 h-8 -> icon-xl

  const replaces = [
    { from: /w-4 h-4/g, to: 'icon-sm' },
    { from: /h-4 w-4/g, to: 'icon-sm' },
    { from: /w-5 h-5/g, to: 'icon-md' },
    { from: /h-5 w-5/g, to: 'icon-md' },
    { from: /w-6 h-6/g, to: 'icon-lg' },
    { from: /h-6 w-6/g, to: 'icon-lg' },
    { from: /w-8 h-8/g, to: 'icon-xl' },
    { from: /h-8 w-8/g, to: 'icon-xl' }
  ];

  for (const { from, to } of replaces) {
    if (from.test(content)) {
      content = content.replace(from, to);
      updated = true;
    }
  }

  if (updated) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
  }
}

console.log(`Updated icons in ${count} files.`);
