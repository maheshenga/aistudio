const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
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

const files = walk('./src/');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content
    .replace(/bg-gray-900 hover:bg-gray-800 text-white/g, 'bg-blue-600 hover:bg-blue-700 text-white')
    .replace(/bg-gray-900 hover:bg-black text-white/g, 'bg-blue-600 hover:bg-blue-700 text-white')
    .replace(/bg-gray-900 text-white/g, 'bg-blue-600 text-white')
    .replace(/border-gray-900 bg-gray-900 text-white/g, 'border-blue-600 bg-blue-600 text-white')
    .replace(/focus:ring-gray-900/g, 'focus:ring-blue-600');
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Updated ${file}`);
  }
});
