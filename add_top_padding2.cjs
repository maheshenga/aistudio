const fs = require('fs');
let c = fs.readFileSync('src/components/StoreView.tsx', 'utf8');
c = c.replace(/className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 py-8"/g, 'className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 pt-12 lg:pt-16 pb-12"');
fs.writeFileSync('src/components/StoreView.tsx', c);
