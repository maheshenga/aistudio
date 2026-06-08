const fs = require('fs');
let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const brokenRe = `        {!isCollapsed && (
           <div className="ml-3 flex flex-col justify-center">
             <span className="font-extrabold text-gray-900 text-[16px] tracking-tight hover:text-black transition-colors cursor-pointer leading-none">个人AI助手</span>
             <span className="text-[10px] text-blue-500 font-bold tracking-wider mt-1 flex items-center">
               <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
               多AGENT集群就绪
             </span>
           </div>
           <div className="ml-auto w-10 h-10 relative flex items-center justify-center -mr-2 tooltip" title="Agent Capacity / Daily Quota: 82%">
             <svg className="w-full h-full transform -rotate-90">
               <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-gray-100" />
               <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="3" fill="transparent" strokeDasharray="88" strokeDashoffset="16" className="text-blue-500" strokeLinecap="round" />
             </svg>
             <span className="absolute text-[9px] font-black text-gray-700">82%</span>
           </div>
           </div>
        )}`;

const fixedRep = `        {!isCollapsed && (
           <>
             <div className="ml-3 flex flex-col justify-center">
               <span className="font-extrabold text-gray-900 text-[16px] tracking-tight hover:text-black transition-colors cursor-pointer leading-none">个人AI助手</span>
               <span className="text-[10px] text-blue-500 font-bold tracking-wider mt-1 flex items-center">
                 <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                 多AGENT集群就绪
               </span>
             </div>
             <div className="ml-auto w-10 h-10 relative flex items-center justify-center -mr-2 tooltip" title="Agent Capacity / Daily Quota: 82%">
               <svg className="w-full h-full transform -rotate-90">
                 <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-gray-100" />
                 <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="3" fill="transparent" strokeDasharray="88" strokeDashoffset="16" className="text-blue-500" strokeLinecap="round" />
               </svg>
               <span className="absolute text-[9px] font-black text-gray-700">82%</span>
             </div>
           </>
        )}`;

sidebar = sidebar.replace(brokenRe, fixedRep);
fs.writeFileSync('src/components/Sidebar.tsx', sidebar);
