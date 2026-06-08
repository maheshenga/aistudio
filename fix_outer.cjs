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
  
  if (content.includes('gap-4 ')) {
    content = content.replace(/gap-4 /g, 'gap-[var(--spacing-md)] ');
    updated = true;
  }
  if (content.includes('gap-4"')) {
    content = content.replace(/gap-4"/g, 'gap-[var(--spacing-md)]"');
    updated = true;
  }
  if (content.includes('gap-5 ')) {
    content = content.replace(/gap-5 /g, 'gap-[var(--spacing-md)] ');
    updated = true;
  }
  if (content.includes('gap-5"')) {
    content = content.replace(/gap-5"/g, 'gap-[var(--spacing-md)]"');
    updated = true;
  }
  if (content.includes('gap-6 ')) {
    content = content.replace(/gap-6 /g, 'gap-[var(--spacing-md)] ');
    updated = true;
  }
  if (content.includes('gap-6"')) {
    content = content.replace(/gap-6"/g, 'gap-[var(--spacing-md)]"');
    updated = true;
  }
  if (content.includes('space-y-4 ')) {
    content = content.replace(/space-y-4 /g, 'space-y-[var(--spacing-md)] ');
    updated = true;
  }
  if (content.includes('space-y-4"')) {
    content = content.replace(/space-y-4"/g, 'space-y-[var(--spacing-md)]"');
    updated = true;
  }
  if (content.includes('space-y-5 ')) {
    content = content.replace(/space-y-5 /g, 'space-y-[var(--spacing-md)] ');
    updated = true;
  }
  if (content.includes('space-y-5"')) {
    content = content.replace(/space-y-5"/g, 'space-y-[var(--spacing-md)]"');
    updated = true;
  }
  if (content.includes('space-y-6 ')) {
    content = content.replace(/space-y-6 /g, 'space-y-[var(--spacing-md)] ');
    updated = true;
  }
  if (content.includes('space-y-6"')) {
    content = content.replace(/space-y-6"/g, 'space-y-[var(--spacing-md)]"');
    updated = true;
  }
  if (content.includes('-mt-')) {
    content = content.replace(/-mt-\d+\.?\d*/g, '');
    updated = true;
  }
  if (content.includes('-ml-')) {
    content = content.replace(/-ml-\d+\.?\d*/g, '');
    updated = true;
  }
  if (content.includes('-mr-')) {
    content = content.replace(/-mr-\d+\.?\d*/g, '');
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
  }
}
console.log(`Updated uniform outer gap/margin in ${count} files.`);
