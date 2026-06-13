import React, { useMemo, useState } from 'react';
import { Send, AtSign, Clock, MessageCircle, Mic, Star } from 'lucide-react';
import { useSaasSession } from '../saas/SaasAuthContext';
import { createWorkspaceTask } from '../lib/data/taskRepository';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import { toast } from './Toast';

export function CustomerComments({ customerId }: { customerId: string }) {
   const session = useSaasSession();
   const taskContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
   const [isRoleplayMode, setIsRoleplayMode] = useState(false);
   const [comments, setComments] = useState([
      { id: 1, user: '陈效', avatar: '效', text: '已发送最新案例库过去。客户反馈非常好，@林设计 这个可以作为你们下个版本的参考。', time: '10:45 AM', type: 'normal' },
      { id: 2, user: '林设计', avatar: '林', text: '收到，我们会排期跟进。', time: '11:20 AM', type: 'normal' }
   ]);
   const [roleplayMsgs, setRoleplayMsgs] = useState([
      { id: 1, user: 'AI 客户扮演', avatar: 'AI', text: '你好，我是该公司的采购经理，关于你们的方案，我觉得价格稍微高了些。', time: '刚才', type: 'ai', score: null } 
   ]);
   const [newComment, setNewComment] = useState('');
   const [isAiTyping, setIsAiTyping] = useState(false);

   const handleSend = () => {
      if (!newComment.trim()) return;
      
      const mentions = newComment.match(/@\S+/g);
      const isRoleplay = isRoleplayMode;
      
      if (isRoleplay) {
         setRoleplayMsgs(prev => [...prev, {
            id: Date.now(),
            user: '我',
            avatar: '我',
            text: newComment,
            time: '刚刚',
            type: 'me',
            score: null
         }]);
         setNewComment('');
         setIsAiTyping(true);

         setIsAiTyping(false);
         setRoleplayMsgs(prev => [...prev, {
            id: Date.now() + 1,
            user: 'AI 话术教练反馈',
            avatar: '教练',
            text: `【话术评分: 85分】回答得不错，成功强调了方案的性价比，但如果能结合具体竞品的劣势进行对比，说服力会更强。继续！`,
            time: '刚刚',
            type: 'coach',
            score: 85
         }, {
            id: Date.now() + 2,
            user: 'AI 客户扮演',
            avatar: 'AI',
            text: '嗯，我理解你们的价值，但是预算方面我需要再去和老板申请，能再给点额外的支持或折扣吗？',
            time: '刚刚',
            type: 'ai',
            score: null
         }]);
         logAuditEvent({
            action: 'crm_roleplay_coach_generate',
            moduleId: 'crm',
            targetType: 'module',
            targetId: customerId,
            metadata: {
               score: 85,
               mode: 'roleplay',
            },
         }, { session });

      } else {
         setComments(prev => [...prev, {
            id: Date.now(),
            user: '我',
            avatar: '我',
            text: newComment,
            time: '刚刚',
            type: 'normal'
         }]);
         setNewComment('');

         if (mentions) {
            const task = createWorkspaceTask({
               title: `[被提及] 客户沟通记录中 @了你`,
               date: new Date().toISOString().slice(0, 10),
               priority: 'High',
               type: '团队协作',
               column: 'todo',
               isAuto: true,
            }, taskContext);
            logAuditEvent({
               action: 'crm_comment_mention_task_sync',
               moduleId: 'crm',
               targetType: 'task',
               targetId: task.id,
               metadata: {
                  customerId,
                  mentions,
                  source: 'customer_comments',
               },
            }, { session });
            window.dispatchEvent(new Event('activity_logged'));
            toast(`已通知 ${mentions.join(', ')}`, 'success');
         }
      }
   };

   const activeMsgs = isRoleplayMode ? roleplayMsgs : comments;

   return (
      <div className={`border ${isRoleplayMode ? 'border-amber-200' : 'border-gray-100'} rounded-xl overflow-hidden mt-8 transition-colors`}>
         <div className={`${isRoleplayMode ? 'bg-amber-50' : 'bg-gray-50'} border-b ${isRoleplayMode ? 'border-amber-200' : 'border-gray-100'} p-3 px-4 flex justify-between items-center`}>
            <h3 className={`text-[13px] font-black ${isRoleplayMode ? 'text-amber-800' : 'text-gray-800'} flex items-center`}>
               {isRoleplayMode ? <Mic className="w-4 h-4 mr-2 text-amber-500" /> : <MessageCircle className="w-4 h-4 mr-2 text-indigo-500" />}
               {isRoleplayMode ? '话术陪练中心 (AI 角色扮演)' : '沟通记录与协作批注'}
            </h3>
            <label className="flex items-center cursor-pointer">
               <div className="relative">
                  <input type="checkbox" className="sr-only" checked={isRoleplayMode} onChange={() => setIsRoleplayMode(!isRoleplayMode)} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${isRoleplayMode ? 'bg-amber-400' : 'bg-gray-300'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isRoleplayMode ? 'transform translate-x-4' : ''}`}></div>
               </div>
               <span className={`ml-2 text-xs font-bold ${isRoleplayMode ? 'text-amber-700' : 'text-gray-500'}`}>陪练模式</span>
            </label>
         </div>
         <div className="bg-white p-4 h-64 overflow-y-auto space-y-4 custom-scrollbar">
            {activeMsgs.map((msg: any, i) => (
               <div key={i} className="flex space-x-3">
                  <div className={`w-8 h-8 rounded-full ${msg.type === 'coach' ? 'bg-gradient-to-br from-green-100 to-emerald-200 border-emerald-300' : msg.type === 'ai' ? 'bg-gradient-to-br from-amber-100 to-orange-200 border-amber-300' : 'bg-gradient-to-br from-indigo-100 to-purple-100 border-indigo-200'} flex items-center justify-center shrink-0 border`}>
                     <span className={`text-[11px] font-black ${msg.type === 'coach' ? 'text-emerald-700' : msg.type === 'ai' ? 'text-amber-800' : 'text-indigo-700'}`}>{msg.avatar}</span>
                  </div>
                  <div className="flex-1">
                     <div className="flex items-center space-x-2 mb-1">
                        <span className="text-[12px] font-bold text-gray-800">{msg.user}</span>
                        <span className="text-[10px] font-medium text-gray-400 flex items-center"><Clock className="w-3 h-3 justify-center mr-0.5" />{msg.time}</span>
                        {msg.score && <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded flex items-center font-bold"><Star className="w-3 h-3 mr-0.5" /> {msg.score}</span>}
                     </div>
                     <p className={`text-[13px] leading-relaxed font-medium p-3 rounded-tr-xl rounded-b-xl border ${msg.type === 'coach' ? 'bg-green-50/50 border-green-100 text-green-800' : msg.type === 'ai' ? 'bg-amber-50/50 border-amber-100 text-amber-900' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                        {msg.text}
                     </p>
                  </div>
               </div>
            ))}
            {isAiTyping && (
               <div className="flex space-x-3 opacity-70">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center"><span className="text-[11px] font-bold text-amber-700">AI</span></div>
                  <div className="bg-amber-50 p-3 rounded-tr-xl rounded-b-xl flex space-x-1 items-center">
                     <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
                     <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                     <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
               </div>
            )}
         </div>
         <div className={`${isRoleplayMode ? 'bg-amber-50/50' : 'bg-gray-50'} p-3 border-t ${isRoleplayMode ? 'border-amber-200' : 'border-gray-200'}`}>
            <div className={`flex bg-white rounded-xl border ${isRoleplayMode ? 'border-amber-200 focus-within:ring-amber-100 focus-within:border-amber-400' : 'border-gray-200 focus-within:ring-indigo-100 focus-within:border-indigo-400'} shadow-sm focus-within:ring-2 transition-all`}>
               <input 
                  type="text" 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder={isRoleplayMode ? "输入你的对话应对方案..." : "输入沟通记录或 @团队成员..."} 
                  className="w-full bg-transparent border-none focus:outline-none text-[13px] px-3 py-2.5 font-medium" 
               />
               {!isRoleplayMode && (
                  <button onClick={() => setNewComment(prev => prev + '@')} className="px-2 text-gray-400 hover:text-indigo-500 transition-colors">
                     <AtSign className="w-4 h-4" />
                  </button>
               )}
               <button onClick={handleSend} className={`px-3 text-white ${isRoleplayMode ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-500 hover:bg-indigo-600'} rounded-lg m-1 flex items-center justify-center shadow-sm transition-colors`}>
                  <Send className="w-4 h-4" />
               </button>
            </div>
         </div>
      </div>
   );
}
