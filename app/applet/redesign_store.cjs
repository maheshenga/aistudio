const fs = require('fs');
let content = fs.readFileSync('src/components/StoreView.tsx', 'utf8');

// Container
content = content.replace(/max-w-5xl mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300/g, 'max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4');

// Headers
content = content.replace(/text-xl font-bold text-gray-900/g, 'text-[28px] font-black text-gray-900 tracking-tighter leading-tight');
content = content.replace(/text-sm text-gray-500 mt-1/g, 'text-[14px] font-medium text-gray-500 mt-2 tracking-wide');

// Cards
content = content.replace(/bg-white border border-gray-200 rounded-2xl p-5 shadow-sm/g, 'bg-white border border-gray-100/80 rounded-[28px] p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300');
content = content.replace(/bg-white rounded-\[24px\] border border-gray-200 shadow-sm p-5/g, 'bg-white rounded-[28px] border border-gray-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8');
content = content.replace(/bg-white border text-left border-gray-200 rounded-\[24px\] p-5 shadow-sm/g, 'bg-white border text-left border-gray-100/80 rounded-[28px] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-300');

// Card Headers
content = content.replace(/text-\[15px\] font-bold text-gray-900 mb-6/g, 'text-[17px] font-black text-gray-900 tracking-tight mb-8');
content = content.replace(/font-bold text-gray-900 text-\[15px\] mb-4/g, 'font-black text-gray-900 text-[17px] tracking-tight mb-6');

// Tables
content = content.replace(/border-b border-gray-100 text-\[12px\] font-extrabold text-gray-400 uppercase tracking-widest/g, 'border-b border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] bg-gray-50/50');
content = content.replace(/bg-white border text-left border-gray-200 rounded-\[24px\] shadow-sm overflow-hidden/g, 'bg-white border border-gray-100/80 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden');
content = content.replace(/py-4 px-6/g, 'py-5 px-6');

// Input/Select fields
content = content.replace(/border border-gray-200 bg-white shadow-sm text-sm font-bold text-gray-700 px-4 py-2.5 rounded-xl/g, 'border-[1.5px] border-gray-200 bg-white shadow-sm text-sm font-bold text-gray-700 px-4 py-3 rounded-2xl hover:border-gray-300 transition-colors');
content = content.replace(/pl-4 pr-4 py-2 border border-gray-200 rounded-xl/g, 'pl-5 pr-5 py-3 border-[1.5px] border-gray-200 rounded-2xl text-[14px] font-medium hover:border-gray-300 transition-colors');

// Primary Button
content = content.replace(/bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm/g, 'bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:-translate-y-0.5');

// Secondary Button
content = content.replace(/bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl font-bold transition-colors shadow-sm/g, 'bg-white border-[1.5px] border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-3 rounded-2xl font-bold transition-all shadow-sm');


fs.writeFileSync('src/components/StoreView.tsx', content);
