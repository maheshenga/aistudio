const fs = require('fs');

// 1. Update App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf8');
appContent = appContent.replace("return <StoreDashboardView />;", "return <StoreDashboardView onNavigate={(m) => handleModuleNavigate(m as any)} />;");
fs.writeFileSync('src/App.tsx', appContent);

// 2. Update StoreView.tsx
let storeContent = fs.readFileSync('src/components/StoreView.tsx', 'utf8');

// Add props type
storeContent = storeContent.replace("export function StoreDashboardView() {", `export function StoreDashboardView({ onNavigate }: { onNavigate?: (id: string) => void }) {`);

// Add quick actions and Recharts diagram inside StoreDashboardView
// Before the grid grid-cols-1 md:grid-cols-2 gap-6
const gridReplacement = `
      {/* 快捷操作区 */}
      <div className="bg-white rounded-[28px] border border-gray-100 p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
         <div className="flex-1">
           <h3 className="text-[17px] font-black text-gray-900 tracking-tight mb-2">快捷操作</h3>
           <p className="text-sm text-gray-500 font-medium">快速直达日常店务管理</p>
         </div>
         <div className="flex flex-wrap gap-3">
           <button onClick={() => onNavigate && onNavigate('store_orders')} className="flex items-center space-x-2 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 px-5 py-3 rounded-2xl font-bold transition-all border border-blue-100">
             <LayoutTemplate className="w-4 h-4" />
             <span>订单管理</span>
           </button>
           <button onClick={() => onNavigate && onNavigate('store_inventory')} className="flex items-center space-x-2 bg-orange-50 text-orange-700 hover:bg-orange-100 px-5 py-3 rounded-2xl font-bold transition-all border border-orange-100">
             <Split className="w-4 h-4" />
             <span>库存看板</span>
           </button>
           <button onClick={() => onNavigate && onNavigate('store_marketing')} className="flex items-center space-x-2 bg-purple-50 text-purple-700 hover:bg-purple-100 px-5 py-3 rounded-2xl font-bold transition-all border border-purple-100">
             <Megaphone className="w-4 h-4" />
             <span>营销活动</span>
           </button>
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-6">
        <div className="bg-white rounded-[28px] border border-gray-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-[17px] font-black text-gray-900 tracking-tight">今日访问与转化趋势</h3>
             <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-wide">Live Trend</span>
          </div>
          <div className="w-full h-[260px] -ml-4">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={[
                 { time: '08:00', uv: 120, conversion: 2.1 },
                 { time: '10:00', uv: 280, conversion: 3.4 },
                 { time: '12:00', uv: 450, conversion: 4.8 },
                 { time: '14:00', uv: 850, conversion: 5.2 },
                 { time: '16:00', uv: 1020, conversion: 4.9 },
                 { time: '18:00', uv: 780, conversion: 3.2 },
                 { time: '20:00', uv: 1350, conversion: 6.8 },
               ]} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                 <defs>
                   <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                 <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                 <Area type="monotone" dataKey="uv" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorUv)" />
               </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-[28px] border border-gray-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8 flex-1">`;

const oldGrid = `<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-[28px] border border-gray-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8">`;

storeContent = storeContent.replace(oldGrid, gridReplacement);

// Close out the new wrappers
const oldClosing = `              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border text-left`;

const newClosing = `              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border text-left`;

storeContent = storeContent.replace(oldClosing, newClosing);

fs.writeFileSync('src/components/StoreView.tsx', storeContent);
