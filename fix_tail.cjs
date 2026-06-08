const fs = require('fs');
let content = fs.readFileSync('./src/components/GlobalAgentDispatcherModal.tsx', 'utf8');

// Find the first </BaseModal> and cut anything after it, then add ;\n}
const idx = content.indexOf('</BaseModal>');
if (idx !== -1) {
  content = content.substring(0, idx + '</BaseModal>'.length) + '\n  );\n}\n';
  fs.writeFileSync('./src/components/GlobalAgentDispatcherModal.tsx', content, 'utf8');
  console.log('Fixed syntax error by trimming');
}

