const fs = require('fs');

const files = [
  './src/components/GlobalAgentDispatcherModal.tsx',
  './src/components/KeyboardShortcutsHelp.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\\`/g, "`");
  content = content.replace(/\\\${/g, "${");
  fs.writeFileSync(file, content, 'utf8');
});
console.log('Fixed escaped backticks');
