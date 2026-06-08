const fs = require('fs');
let content = fs.readFileSync('./src/components/KeyboardShortcutsHelp.tsx', 'utf8');

content = content.replace(/\\\`键盘快捷键 \\\${activeModule \? '- ' \+ activeModule\.replace\('_', ' '\) : ''}\\\`/g, "`键盘快捷键 ${activeModule ? '- ' + activeModule.replace('_', ' ') : ''}`");

fs.writeFileSync('./src/components/KeyboardShortcutsHelp.tsx', content, 'utf8');
console.log('Fixed syntax error');
