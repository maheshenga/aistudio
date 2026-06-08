import * as fs from 'fs';

const p = '/app/applet/src/components/AgentStatusDashboardView.tsx';
let data = fs.readFileSync(p, 'utf-8');

// Find the last occurrence of '</AnimatePresence>'
const idx = data.lastIndexOf('</AnimatePresence>');
if (idx !== -1) {
  // We want to keep everything up to this index, plus the AnimatePresence closure
  data = data.substring(0, idx + '</AnimatePresence>'.length) + '\n      </div>\n    );\n}\n';
  fs.writeFileSync(p, data);
  console.log('Fixed file');
} else {
  console.error('Could not find </AnimatePresence>');
}
