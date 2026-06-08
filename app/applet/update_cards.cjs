const fs = require('fs');
let c = fs.readFileSync('src/components/StoreView.tsx', 'utf8');

c = c.replace(
  /<p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">{s\.label}<\/p>\s*<p className={`text-2xl font-bold \${s\.color} mb-1`}>{s\.value}<\/p>\s*<p className="text-\[11px\] font-bold text-gray-500">{s\.sub}<\/p>/g,
  '<p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2">{s.label}</p><p className={`text-[32px] font-black tracking-tight ${s.color} mb-2 leading-none`}>{s.value}</p><p className="text-[12px] font-bold text-gray-500 bg-gray-50 self-start inline-block px-2.5 py-1 rounded-md">{s.sub}</p>'
);

c = c.replace(
  /font-bold text-gray-900 mb-6/g,
  'font-black text-gray-900 tracking-tight mb-8'
);

c = c.replace(
  /text-\[12px\] font-extrabold text-gray-400 uppercase tracking-widest/g,
  'text-[12px] font-black text-gray-400 uppercase tracking-[0.15em] bg-gray-50/50'
);

// Inner task lists
c = c.replace(
  /<div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">/g,
  '<div className="flex items-center justify-between p-4 bg-red-50/50 hover:bg-red-50 transition-colors border border-red-100 rounded-2xl">'
);
c = c.replace(
  /<div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">/g,
  '<div className="flex items-center justify-between p-4 bg-orange-50/50 hover:bg-orange-50 transition-colors border border-orange-100 rounded-2xl">'
);
c = c.replace(
  /<div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">/g,
  '<div className="flex items-center justify-between p-4 bg-blue-50/50 hover:bg-blue-50 transition-colors border border-blue-100 rounded-2xl">'
);

fs.writeFileSync('src/components/StoreView.tsx', c);
