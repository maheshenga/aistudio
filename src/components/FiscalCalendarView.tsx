import React, { useState, useEffect } from 'react';
import { Calendar, Tag, Info, CalendarCheck, CalendarIcon, ChevronLeft, ChevronRight, Clock, AlertTriangle, FileText, CheckSquare, Plus, Bell } from 'lucide-react';
import { toast } from './Toast';

export interface TaxEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: 'tax_deadline' | 'audit_window' | 'invoice_due';
  description: string;
  summary: string;
  amount?: string;
  status: 'pending' | 'completed' | 'urgent';
  daysUntil?: number;
}

const generateMockEvents = (): TaxEvent[] => {
  const today = new Date();
  
  // Create some dates relative to today
  const addDays = (days: number) => {
    const d = new Date(today);
    d.setDate(today.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  return [
    {
      id: 'e1',
      date: addDays(3),
      title: 'Q2 企业所得税预缴',
      type: 'tax_deadline',
      description: '需完成季度所得税预估与申报',
      summary: '相关交易：本季度销项专票核开金额共计 ¥ 50,000.00，实际进项抵扣 ¥ 3,650.00。请确保所有可抵扣发票已归档。',
      amount: '¥ 12,450.00',
      status: 'urgent',
      daysUntil: 3
    },
    {
      id: 'e2',
      date: addDays(10),
      title: '年度高新企业复审',
      type: 'audit_window',
      description: '准备并提交三年内研发费用相关凭证',
      summary: '相关交易：研发加计扣除专项，已归集研发外包支出共计 ¥ 112,000.00。',
      status: 'pending',
      daysUntil: 10
    },
    {
      id: 'e5',
      date: addDays(7),
      title: '增值税申报预警',
      type: 'tax_deadline',
      description: '检查并确认本月所有进销项发票',
      summary: '相关交易：本月已收到进项发票未认证金额 ¥ 8,500.00。',
      amount: '¥ 8,500.00',
      status: 'pending',
      daysUntil: 7
    },
    {
      id: 'e3',
      date: addDays(1),
      title: 'Stripe 跨境汇款进项认证',
      type: 'invoice_due',
      description: '海关完税凭证电子划拨核对外汇流向',
      summary: '相关交易：包含 1,500 USD (按汇率 7.30 折合 ¥ 10,950.00)。',
      amount: '¥ 10,950.00',
      status: 'pending',
      daysUntil: 1
    },
    {
      id: 'e4',
      date: addDays(-2),
      title: '上月员工个税代扣代缴',
      type: 'tax_deadline',
      description: '已完成全员薪金薪酬核算与纳税申报',
      summary: '相关交易：公司总薪酬支出 ¥ 125,000.00。',
      status: 'completed',
      daysUntil: -2
    }
  ];
};

export const MOCK_EVENTS = generateMockEvents();

export function FiscalCalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [hoveredEvent, setHoveredEvent] = useState<TaxEvent | null>(null);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getEventsForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return MOCK_EVENTS.filter(e => e.date === dateStr);
  };

  const toggleEventSelection = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedEvents.includes(eventId)) {
      setSelectedEvents(selectedEvents.filter(id => id !== eventId));
    } else {
      setSelectedEvents([...selectedEvents, eventId]);
    }
  };

  const handleSyncToTaskCenter = () => {
    if (selectedEvents.length === 0) {
      toast('请先选择事项', 'info');
      return;
    }
    toast(`已将 ${selectedEvents.length} 个税务事项同步至 TaskCenter，为您自动建立提醒`, 'success');
    setSelectedEvents([]);
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'tax_deadline': return 'bg-red-500';
      case 'audit_window': return 'bg-amber-500';
      case 'invoice_due': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50/30 border border-gray-100 rounded-lg"></div>);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const events = getEventsForDate(d);
    // removing day-level isSelected background
    days.push(
      <div 
        key={d} 
        className={`h-24 p-2 border border-gray-100 bg-white rounded-lg transition-colors relative group`}
      >
        <div className={`text-xs font-bold text-gray-500 mb-1`}>{d}</div>
        <div className="flex flex-col gap-1 overflow-hidden">
          {events.map((ev, idx) => {
            const isSelected = selectedEvents.includes(ev.id);
            return (
            <div 
              key={idx} 
              onClick={(e) => toggleEventSelection(ev.id, e)}
              onMouseEnter={() => setHoveredEvent(ev)}
              onMouseLeave={() => setHoveredEvent(null)}
              className={`w-full cursor-pointer py-0.5 px-1.5 rounded flex items-center ${
                isSelected ? 'ring-2 ring-indigo-500 shadow-sm' : ''
              } ${
                ev.type === 'tax_deadline' ? 'bg-red-50 text-red-700' :
                ev.type === 'audit_window' ? 'bg-amber-50 text-amber-700' :
                'bg-blue-50 text-blue-700'
              } text-[10px] font-bold border ${
                ev.type === 'tax_deadline' ? 'border-red-200' :
                ev.type === 'audit_window' ? 'border-amber-200' :
                'border-blue-200'
              }`}
            >
               <span className={`w-1.5 h-1.5 rounded-full ${getEventColor(ev.type)} mr-1 shrink-0`}></span>
               <span className="truncate">{ev.title}</span>
            </div>
          )})}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[var(--border-color)] p-6 shadow-sm flex flex-col print:hidden mt-6 relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-gray-800 text-[15px] flex items-center">
            <CalendarCheck className="w-5 h-5 text-indigo-500 mr-2" /> 财税全局日历与提醒 (FiscalCalendar)
          </h3>
          <p className="text-[12px] text-gray-500 font-medium mt-1">聚合税务申报点、内审排期及发票收付款截止日。</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleSyncToTaskCenter}
            className="px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 font-bold text-xs rounded-xl transition-colors flex items-center"
          >
            <CheckSquare className="w-3.5 h-3.5 mr-1.5" /> Sync to TaskCenter
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex space-x-3 text-xs font-bold text-gray-500">
           <span className="flex items-center"><span className="w-2.5 h-2.5 bg-red-500 rounded-full mr-1.5"></span> 纳税申报期</span>
           <span className="flex items-center"><span className="w-2.5 h-2.5 bg-amber-500 rounded-full mr-1.5"></span> 审计防线</span>
           <span className="flex items-center"><span className="w-2.5 h-2.5 bg-blue-500 rounded-full mr-1.5"></span> 票据汇缴点</span>
        </div>
        <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 p-1">
           <button onClick={handlePrevMonth} className="p-1 hover:bg-white rounded text-gray-500 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
           <span className="text-sm font-black text-gray-800 px-3 w-32 text-center">{currentDate.getFullYear()} 年 {currentDate.getMonth() + 1} 月</span>
           <button onClick={handleNextMonth} className="p-1 hover:bg-white rounded text-gray-500 transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {['日', '一', '二', '三', '四', '五', '六'].map(day => (
           <div key={day} className="text-center text-[11px] font-bold text-gray-400 py-1">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days}
      </div>

      {hoveredEvent && (
        <div className="absolute z-10 bottom-6 left-1/2 transform -translate-x-1/2 w-96 bg-gray-900 border border-gray-700 shadow-2xl rounded-xl p-4 text-white animate-in zoom-in-95 duration-200 pointer-events-none">
           <div className="flex items-center mb-2">
              <span className={`w-2 h-2 rounded-full ${getEventColor(hoveredEvent.type)} mr-2`}></span>
              <h4 className="text-sm font-bold truncate">{hoveredEvent.title}</h4>
           </div>
           <p className="text-xs text-gray-400 font-medium mb-3">{hoveredEvent.description}</p>
           <div className="bg-gray-800 p-2.5 rounded-lg border border-gray-700">
              <span className="text-[10px] font-bold text-gray-500 mb-1 block uppercase tracking-wider">关联交易汇总 (Transaction Summary)</span>
              <p className="text-[11px] text-gray-300 font-medium leading-relaxed">{hoveredEvent.summary}</p>
              {hoveredEvent.amount && <p className="text-sm font-black text-emerald-400 mt-2">{hoveredEvent.amount}</p>}
           </div>
           <div className="mt-3 text-[10px] font-bold text-gray-500 flex justify-between items-center">
              <span>日期: {hoveredEvent.date}</span>
              <span className={hoveredEvent.status === 'urgent' ? 'text-red-400' : 'text-blue-400'}>{hoveredEvent.status.toUpperCase()}</span>
           </div>
        </div>
      )}
    </div>
  );
}
