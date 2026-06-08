const fs = require('fs');
let content = fs.readFileSync('./src/components/GlobalAgentDispatcherModal.tsx', 'utf8');

content = content.replace("    });  return (", "    });\n  };\n\n  return (");
fs.writeFileSync('./src/components/GlobalAgentDispatcherModal.tsx', content, 'utf8');
console.log('Fixed brace matching');
