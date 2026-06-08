import React from 'react';
import { X, Mail, Bell, MessageCircle, AlertCircle, ChevronRight, MessageSquareDashed } from 'lucide-react';

interface InternalMessagesProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InternalMessages({ isOpen, onClose }: InternalMessagesProps) {
  const messages = [
    { id: 1, title: '系统升级通知', desc: '平台将于今晚凌晨 02:00 进行维护，预计持续 1 小时，为您带来的不便敬请谅解。', time: '1 小时前', type: 'system', read: false },
    { id: 2, title: '任务执行失败', desc: '您的混剪任务「抖音带货预热 03」遇到素材格式不受支持的错误，点击查看详情并重试。', time: '2 小时前', type: 'alert', read: false },
    { id: 3, title: '收到新提醒', desc: '外包专员 Ethan 刚刚在「2026 年度营销策略规划」文档中请求确认需求。', time: '昨天', type: 'social', read: true },
    { id: 4, title: '算力余额预警', desc: '主账户目前的可用算力点不足 500 点，为了不影响持续自动任务执行，请及时充值。', time: '2 天前', type: 'alert', read: true },
    { id: 5, title: '版本更新: 混剪强化', desc: '现已支持爆款视频一键仿写复刻功能！点击进入「混剪中心」尝试。', time: '3 天前', type: 'system', read: true }
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/10 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}
      
      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-[380px] bg-[var(--bg-panel)] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]">
          <div>
             <h2 className="text-[17px] font-bold text-[var(--text-main)] flex items-center">
                <Mail className="icon-md mr-2 text-[var(--color-primary)]" />
                站内信封
             </h2>
             <p className="text-xs text-[var(--text-muted)] mt-1">您有 2 条未读消息</p>
          </div>
          <div className="flex space-x-2 items-center">
             <button className="text-xs font-bold text-[var(--color-primary)] hover:text-blue-800">全部已读</button>
             <button 
               onClick={onClose}
               className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
             >
               <X className="icon-md" />
             </button>
          </div>
        </div>

        <div className="flex bg-gray-50/50 p-2 border-b border-[var(--border-color)]">
           <button className="flex-1 py-1.5 text-xs font-bold text-[var(--text-main)] bg-[var(--bg-panel)] rounded-md shadow-sm">全部消息</button>
           <button className="flex-1 py-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-gray-700">系统通知</button>
           <button className="flex-1 py-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-gray-700">工作提醒</button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-gray-100">
           {messages.map(msg => (
              <div key={msg.id} className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors relative group ${!msg.read ? 'bg-blue-50/20' : ''}`}>
                 {/* Unread indicator */}
                 {!msg.read && <div className="absolute left-2.5 top-5 w-2 h-2 rounded-full bg-blue-500"></div>}
                 
                 <div className="pl-4">
                    <div className="flex justify-between items-start mb-1">
                       <h4 className={`text-sm tracking-tight ${!msg.read ? 'font-black text-[var(--text-main)]' : 'font-bold text-gray-700'}`}>
                          {msg.type === 'system' && <Bell className="w-3.5 h-3.5 inline-block mr-1 text-blue-500 mb-0.5" />}
                          {msg.type === 'alert' && <AlertCircle className="w-3.5 h-3.5 inline-block mr-1 text-red-500 mb-0.5" />}
                          {msg.type === 'social' && <MessageCircle className="w-3.5 h-3.5 inline-block mr-1 text-green-500 mb-0.5" />}
                          {msg.title}
                       </h4>
                       <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap ml-2">{msg.time}</span>
                    </div>
                    <p className={`text-xs leading-relaxed mt-1.5 ${!msg.read ? 'text-gray-600 font-medium' : 'text-[var(--text-muted)]'}`}>
                       {msg.desc}
                    </p>
                 </div>
              </div>
           ))}
        </div>
        
        <div className="p-4 border-t border-[var(--border-color)] bg-gray-50">
           <button className="w-full text-[13px] font-bold text-gray-600 hover:text-[var(--text-main)] transition-colors flex items-center justify-center py-2 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-lg)] hover:bg-gray-50 shadow-sm">
              查看全部历史消息 <ChevronRight className="icon-sm ml-1" />
           </button>
        </div>
      </div>
    </>
  );
}
