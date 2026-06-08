import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, FileText, CheckSquare, Calendar, Loader2, DollarSign, BrainCircuit, AlertCircle } from 'lucide-react';
import { toast } from './Toast';

export function FinanceMeetingAssistant() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  
  const transcriptRef = useRef<HTMLDivElement>(null);
  
  const mockPhrases = [
    "系统: 正在启动财务会议录音助手...",
    "财务总监: 上个月我们的公关营销支出超标了约28%，需要严格控制。",
    "法务: 海外业务的这笔1,500美金收款，税务合规的凭证需要抓紧准备。",
    "产品负责人: Next版本可能会增加外包支出，预计在5万元左右，我们需要提前做税务规划。",
    "系统: 会议录音已结束，正在提取财务摘要与待办事项..."
  ];

  useEffect(() => {
    if (transcriptRef.current) {
        transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setIsProcessing(true);
      
      // Simulate processing and taking 1 more phrase
      setTimeout(() => {
        setTranscript(prev => [...prev, mockPhrases[4]]);
      }, 500);

      setTimeout(() => {
        setIsProcessing(false);
        setSummary({
          overview: "本次会议复盘了本季度资金情况及税务预期。核心关注：营销支出控制、海外收款凭证合规、以及下月研发外包税务筹划。",
          actionItems: [
            { id: 1, title: "准备海外收款(1,500 USD)相关的税务完税凭证", type: "tax", priority: "high" },
            { id: 2, title: "复核本月公关类支出，调整下月预算预估表", type: "budget", priority: "medium" },
            { id: 3, title: "为 Next 阶段的 5 万元研发外包拟定合同及税务要求", type: "compliance", priority: "medium" }
          ]
        });
        toast('财务会议记录已分析完毕并同步至任务中心', 'success');
        
        // sync to task center
        window.dispatchEvent(new CustomEvent('SYNC_CRM_TASKS', { 
            detail: [
                { id: `meeting-task-1-${Date.now()}`, title: "【合规】准备海外收款(1,500 USD)相关的税务完税凭证", dueDate: new Date(Date.now() + 86400000 * 2), priority: 'high', type: '财务合规审批' },
                { id: `meeting-task-2-${Date.now()}`, title: "【预算】为 Next 阶段的 5 万元研发外包拟定合同及税务要求", dueDate: new Date(Date.now() + 86400000 * 5), priority: 'medium', type: '任务分配' }
            ]
        }));
      }, 3000);
      return;
    }

    // Start recording
    setIsRecording(true);
    setTranscript([mockPhrases[0]]);
    setSummary(null);
    
    let index = 1;
    const interval = setInterval(() => {
      if (index < 4) {
        setTranscript(prev => [...prev, mockPhrases[index]]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 2000);
    
    // Stop after phrase 3 finishes
    setTimeout(() => {
        if (isRecording) {
            clearInterval(interval);
        }
    }, 8000);
  };

  return (
    <div className="bg-white rounded-2xl border border-[var(--border-color)] p-6 shadow-sm flex flex-col mb-[var(--spacing-xl)] shrink-0 print:hidden animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800 text-[15px] flex items-center">
          <BrainCircuit className="w-5 h-5 text-purple-500 mr-2" /> AI 财务会议复盘专家
        </h3>
        <button 
          onClick={toggleRecording} 
          disabled={isProcessing}
          className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all ${isRecording ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse' : isProcessing ? 'bg-gray-100 text-gray-500 border border-gray-200' : 'bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100'}`}
        >
          {isProcessing ? (
             <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 处理中...</>
          ) : isRecording ? (
            <><MicOff className="w-4 h-4 mr-2" /> 结束分析</>
          ) : (
            <><Mic className="w-4 h-4 mr-2" /> 开始自动记录分析</>
          )}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 h-[220px]">
         {/* Live Transcript */}
         <div className="flex-1 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-xl p-4 overflow-y-auto custom-scrollbar" ref={transcriptRef}>
            {transcript.length === 0 && !summary && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                 <Mic className="w-8 h-8 mb-2 opacity-50" />
                 <p className="text-xs font-medium">点击上方按钮，开始录制并自动提取财务决议...</p>
              </div>
            )}
            <div className="space-y-3">
              {transcript.map((line, idx) => (
                 <div key={idx} className="text-sm font-medium">
                    <span className="font-bold text-gray-700 mr-1">{line.split(':')[0]}:</span> 
                    <span className="text-gray-600">{line.split(':')[1]}</span>
                 </div>
              ))}
            </div>
         </div>

         {/* Summary Result */}
         <div className={`flex-1 border border-[var(--border-color)] rounded-xl p-4 overflow-y-auto custom-scrollbar transition-all ${summary ? 'bg-purple-50/30' : 'bg-[var(--bg-panel)]'}`}>
             {!summary ? (
                 <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <FileText className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-xs font-medium">决议摘要与待办提取区</p>
                 </div>
             ) : (
                 <div className="animate-in slide-in-from-bottom-2 duration-300">
                    <h4 className="text-[13px] font-bold text-purple-800 mb-2">会议财务决议摘要</h4>
                    <p className="text-xs text-gray-600 font-medium leading-relaxed mb-4">{summary.overview}</p>
                    
                    <h4 className="text-[13px] font-bold text-purple-800 mb-2">自动抽取待办与合规检查点</h4>
                    <div className="space-y-2">
                       {summary.actionItems.map((item: any) => (
                           <div key={item.id} className="bg-white p-3 rounded-lg border border-purple-100 shadow-sm flex items-start">
                              <CheckSquare className="w-4 h-4 text-purple-500 mr-2 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-xs font-bold text-gray-800 mb-1">{item.title}</p>
                                <div className="flex space-x-2">
                                  {item.priority === 'high' && <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 font-bold">高优</span>}
                                  {item.type === 'tax' && <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100 font-bold">税务事宜</span>}
                                  {item.type === 'compliance' && <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100 font-bold">合规核查</span>}
                                </div>
                              </div>
                              <span className="text-[10px] text-emerald-600 font-bold ml-2 bg-emerald-50 px-2 py-0.5 rounded mt-1 border border-emerald-100 whitespace-nowrap">已同步</span>
                           </div>
                       ))}
                    </div>
                 </div>
             )}
         </div>
      </div>
    </div>
  );
}
