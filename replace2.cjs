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
    .replace(/bg-gray-900 border border-transparent hover:bg-black text-white/g, 'bg-blue-600 border border-transparent hover:bg-blue-700 text-white')
    .replace(/bg-gray-900 hover:bg-black px-4 py-1.5/g, 'bg-blue-600 hover:bg-blue-700 px-4 py-1.5')
    .replace(/bg-gray-900 hover:bg-black /g, 'bg-blue-600 hover:bg-blue-700 ')
    .replace(/bg-gray-900 shadow border border-gray-900/g, 'bg-blue-600 shadow border-blue-600')
    .replace(/bg-gray-900 border-2 border-black/g, 'bg-blue-600 border-2 border-blue-700')
    .replace(/bg-gray-900 border border-gray-900 hover:bg-gray-800 text-white/g, 'bg-blue-600 hover:bg-blue-700 text-white border-transparent')
    .replace(/bg-gray-900 text-gray-300/g, 'bg-[#1a73e8] text-white') // specific fix
    .replace(/bg-gray-900 hover:bg-black'\} disabled/g, "bg-blue-600 hover:bg-blue-700'} disabled");  
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Updated 2 ${file}`);
  }
});
