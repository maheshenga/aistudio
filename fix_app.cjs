const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

const keyRe = `      // Ctrl+Shift+F -> Toggle Focus Mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFocusMode(prev => !prev);
      }`;
const keyRep = `      // Ctrl+Shift+F -> Toggle Focus Mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFocusMode(prev => !prev);
      }
      // ? -> Keyboard Shortcuts Help
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsShortcutsHelpOpen(prev => !prev);
      }`;

app = app.replace(keyRe, keyRep);
fs.writeFileSync('src/App.tsx', app);
