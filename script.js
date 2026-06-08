const fs = require('fs');
let content = fs.readFileSync('src/components/DIYEditorView.tsx', 'utf8');
content = content.replace(/indigo/g, 'blue');
fs.writeFileSync('src/components/DIYEditorView.tsx', content);
console.log('Replaced all indigo in DIYEditorView');
