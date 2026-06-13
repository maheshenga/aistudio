import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Mic, MicOff, FileText, CheckSquare, Calendar, Loader2 } from 'lucide-react';
import { useSaasSession } from '../saas/SaasAuthContext';
import { createWorkspaceTask } from '../lib/data/taskRepository';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import { toast } from './Toast';

export function MeetingAssistant({ customerId, customerName }: { customerId: string, customerName: string }) {
   const session = useSaasSession();
   const taskContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
   const [isRecording, setIsRecording] = useState(false);
   const [transcript, setTranscript] = useState('');
   const [isProcessing, setIsProcessing] = useState(false);
   const [summary, setSummary] = useState<any>(null);
   const timerRef = useRef<any>(null);

   const toggleRecording = () => {
      if (isRecording) {
         setIsRecording(false);
         clearInterval(timerRef.current);
         handleProcessMeeting();
      } else {
         setIsRecording(true);
         setTranscript('正在聆听会议对话...\n');
         setSummary(null);
         
         const phrases = [
             "系统: 你好，陈经理，我是今天负责对接您的顾问。",
             "客户: 你好，主要是想再探讨一下之前那份自动化方案的落地周期。",
             "系统: 没问题，目前我们预估是一周内可以部署测试。",
             "客户: 好的，那费用方面之前提到的阶梯折扣还能做吗？",
             "系统: 可以的，关于折扣的细则我让商务同事下午发您一份正式邮件确认。"
         ];
         let i = 0;
         timerRef.current = setInterval(() => {
            if (i < phrases.length) {
                setTranscript(prev => prev + '\n' + phrases[i]);
                i++;
            } else {
                clearInterval(timerRef.current);
                setIsRecording(false);
                handleProcessMeeting();
            }
         }, 1500);
      }
   };

   const handleProcessMeeting = () => {
      setIsProcessing(true);
      const meetingSummary = {
         summary: "讨论了自动化方案的落地周期及阶梯折扣。确认一周内可以部署测试，客户要求确认费用折扣细则。",
         actionItems: [
             "安排技术对接自动化方案的测试部署准备",
             "发送阶段折扣的正式邮件给客户"
         ]
      };
      const task = createWorkspaceTask({
         title: `发送阶段折扣正式邮件 - ${customerName}`,
         date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
         priority: 'High',
         type: '客户跟进',
         column: 'todo',
         isAuto: true,
      }, taskContext);
      setIsProcessing(false);
      setSummary(meetingSummary);
      logAuditEvent({
         action: 'crm_meeting_summary_generate',
         moduleId: 'crm',
         targetType: 'module',
         targetId: customerId,
         metadata: {
            customerName,
            actionItemCount: meetingSummary.actionItems.length,
         },
      }, { session });
      logAuditEvent({
         action: 'crm_followup_task_sync',
         moduleId: 'crm',
         targetType: 'task',
         targetId: task.id,
         metadata: {
            customerId,
            customerName,
            source: 'meeting_assistant',
         },
      }, { session });
      window.dispatchEvent(new Event('activity_logged'));
      toast("会议记录已转写完毕", "success");
   };

   useEffect(() => {
      return () => {
         if (timerRef.current) clearInterval(timerRef.current);
      }
   }, []);

   return (
      <div className="bg-white border rounded-xl overflow-hidden mb-4 shadow-sm">
         <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b flex justify-between items-center">
            <h3 className="text-[13px] font-black text-indigo-800 flex items-center">
               <Mic className="w-4 h-4 mr-2" /> 实时会议助手
            </h3>
            <button 
               onClick={toggleRecording}
               className={`flex items-center px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isRecording ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
            >
               {isRecording ? <><MicOff className="w-3.5 h-3.5 mr-1" /> 结束录制与分析</> : <><Mic className="w-3.5 h-3.5 mr-1" /> 开始会议录音</>}
            </button>
         </div>

         {(isRecording || transcript) && (
            <div className="p-4 bg-gray-900 text-gray-300 h-32 overflow-y-auto text-[12px] font-mono whitespace-pre-wrap flex flex-col-reverse custom-scrollbar">
                <div>
                   {transcript}
                   {isRecording && <span className="inline-block w-2.5 h-4 ml-1 bg-green-400 animate-pulse"></span>}
                </div>
            </div>
         )}

         {isProcessing && (
            <div className="p-6 flex flex-col items-center justify-center bg-gray-50 text-indigo-500">
               <Loader2 className="w-6 h-6 animate-spin mb-2" />
               <p className="text-[12px] font-bold">AI 正在生成结构化会议摘要，并提取待办事项...</p>
            </div>
         )}

         {summary && !isProcessing && (
            <div className="p-4 space-y-4 bg-gray-50 h-64 overflow-y-auto custom-scrollbar">
               <div>
                  <h4 className="flex items-center text-[12px] font-bold text-gray-800 mb-2">
                     <FileText className="w-4 h-4 mr-1.5 text-blue-500" /> 会议摘要
                  </h4>
                  <p className="text-[13px] text-gray-600 bg-white p-3 rounded-lg border shadow-sm">{summary.summary}</p>
               </div>
               <div>
                  <h4 className="flex items-center text-[12px] font-bold text-gray-800 mb-2">
                     <CheckSquare className="w-4 h-4 mr-1.5 text-emerald-500" /> 提取的待办事项
                  </h4>
                  <ul className="space-y-2">
                     {summary.actionItems.map((item: string, i: number) => (
                        <li key={i} className="flex items-start text-[13px] text-gray-600 bg-white p-3 rounded-lg border shadow-sm">
                           <input type="checkbox" className="mt-1 mr-2 rounded border-gray-300 text-emerald-500" />
                           {item}
                        </li>
                     ))}
                  </ul>
                  <p className="text-[10px] text-green-600 mt-2 font-bold flex items-center">
                     <Calendar className="w-3 h-3 mr-1" /> 已自动推送到任务中心
                  </p>
               </div>
            </div>
         )}
      </div>
   );
}
