const fs = require('fs');
let c = fs.readFileSync('src/components/StoreView.tsx', 'utf8');

c = c.replace(
  /<p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">([^<]+)<\/p>\s*<p className={`text-2xl font-bold \${([^{}]+)}`}>([^<]+)<\/p>/g,
  '<p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2">$1</p><p className={`text-[32px] font-black tracking-tight ${$2} mb-2 leading-none`}>$3</p>'
);

fs.writeFileSync('src/components/StoreView.tsx', c);
