import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Settings2, Mic, History, Wand2, Plus, SlidersHorizontal, AudioLines, Share2, Sparkles, Search, Trash2, Globe, User, Layers, FileText, ChevronDown, SplitSquareVertical, GripVertical } from 'lucide-react';

const VOICES = [
  { id: 'v1', name: 'Alloy', lang: '多语种', gender: '女声', type: '新闻联播 / 旁白', bg: 'bg-emerald-50', text: 'text-emerald-600', tags: ['清晰', '专业', '中立'] },
  { id: 'v2', name: 'Echo', lang: '单语种 (中)', gender: '男声', type: '日常对话 / 播客', bg: 'bg-blue-50', text: 'text-[var(--color-primary)]', tags: ['自然', '温暖', '磁性'] },
  { id: 'v3', name: 'Fable', lang: '多语种', gender: '童声', type: '有声书 / 故事传记', bg: 'bg-purple-50', text: 'text-purple-600', tags: ['活泼', '张力', '纯真'] },
  { id: 'v4', name: 'Onyx', lang: '多语种', gender: '男声', type: '纪录片 / 严肃科普', bg: 'bg-slate-50', text: 'text-slate-600', tags: ['浑厚', '低沉', '权威'] },
  { id: 'v5', name: 'Nova', lang: '单语种 (英)', gender: '女声', type: '商业广告 / 宣传片', bg: 'bg-rose-50', text: 'text-rose-600', tags: ['热情', '清脆', '悦耳'] },
  { id: 'v6', name: 'Shimmer', lang: '多语种', gender: '女声', type: '情感电台 / 冥想', bg: 'bg-indigo-50', text: 'text-indigo-600', tags: ['空灵', '疗愈', '舒缓'] },
];

const MOCK_HISTORY = [
  { id: 1, title: '《未来简史》第三章旁白', duration: '12:45', voice: 'Onyx', time: '10分钟前' },
  { id: 2, title: '小红书美妆测评配音', duration: '03:20', voice: 'Nova', time: '2小时前' },
  { id: 3, title: '儿童睡前故事 - 小王子', duration: '15:10', voice: 'Fable', time: '昨天' },
  { id: 4, title: '月度矩阵带货数据复盘AI生成', duration: '08:35', voice: 'Alloy', time: '3天前' },
];

export function SpeechView() {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [text, setText] = useState('在这个速生的时代，我们常常忘记了停下脚步。你好，我是多语种智能语音引擎。我能用富有情感的声音，将文字转化为触动人心的旋律。');
  const [scriptLines, setScriptLines] = useState([
    { id: '1', role: '旁白', text: '欢迎来到未来世界，在这里，一切皆有可能。', voiceId: 'v4', speed: 1.0, pause: 0.5, showSettings: false },
    { id: '2', role: '向导', text: '跟我来，我带你参观核心控制室。', voiceId: 'v5', speed: 1.1, pause: 0.2, showSettings: false },
    { id: '3', role: '主角', text: '好震撼的场景...这就是AI的力量吗？', voiceId: 'v2', speed: 0.9, pause: 1.0, showSettings: false },
  ]);
  const [activeVoice, setActiveVoice] = useState(VOICES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  
  // Settings
  const [speed, setSpeed] = useState(1.0);
  const [stability, setStability] = useState(0.5);
  const [clarity, setClarity] = useState(0.75);

  const [searchQuery, setSearchQuery] = useState('');

  const progressRef = useRef<HTMLDivElement>(null);

  const addScriptLine = () => {
    setScriptLines([...scriptLines, { id: Date.now().toString(), role: '新角色', text: '', voiceId: activeVoice.id, speed: 1.0, pause: 0.5, showSettings: false }]);
  };

  const removeScriptLine = (id: string) => {
    setScriptLines(scriptLines.filter(line => line.id !== id));
  };

  const updateScriptLine = (id: string, field: string, value: any) => {
    setScriptLines(scriptLines.map(line => line.id === id ? { ...line, [field]: value } : line));
  };

  // Playback mock simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        // Just mock updating something if needed
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleGenerate = () => {
    const hasContent = mode === 'single' ? text.trim() : scriptLines.some(line => line.text.trim());
    if (!hasContent || isGenerating) return;
    setIsGenerating(true);
    setAudioReady(false);
    setIsPlaying(false);
    
    setTimeout(() => {
      setIsGenerating(false);
      setAudioReady(true);
      setIsPlaying(true);
      
      // Auto stop after 5s for demo
      setTimeout(() => {
        setIsPlaying(false);
      }, 5000);
    }, 2000);
  };

  const togglePlay = () => {
    if (!audioReady) {
      handleGenerate();
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-[#FDFDFE]">
      {/* Left Sidebar - Voice Library & History */}
      <div className="w-[320px] border-r border-[var(--border-color)] flex flex-col bg-[var(--bg-panel)] flex-shrink-0 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.01)] animate-in slide-in-from-left-4 duration-300">
        <div className="p-5 border-b border-[var(--border-color)]">
          <div className="flex items-center space-x-2 text-[var(--text-main)] font-black text-lg mb-4">
            <Mic className="icon-md text-[var(--color-primary)]" />
            <span>声音克隆与合成</span>
          </div>
          <button className="w-full flex items-center justify-center space-x-2 bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-[var(--radius-lg)] transition-all shadow-sm transform hover:-translate-y-0.5">
            <Plus className="icon-sm" />
            <span>克隆我的声音</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Voices Section */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-widest">预设声纹库</h3>
              <button className="text-[11px] text-[var(--color-primary)] hover:text-blue-700 font-bold flex items-center">
                <SlidersHorizontal className="w-3 h-3 mr-1" />
                筛选
              </button>
            </div>
            
            <div className="relative mb-4">
              <Search className="icon-sm text-gray-400 absolute left-3 top-2.5" />
              <input 
                type="text" 
                placeholder="搜索声音或情感风格..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-[var(--border-color)] rounded-lg pl-9 pr-4 py-2 text-[13px] outline-none focus:bg-[var(--bg-panel)] focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-2.5">
              {VOICES.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.tags.some(t => t.includes(searchQuery))).map(voice => (
                <div 
                  key={voice.id}
                  onClick={() => setActiveVoice(voice)}
                  className={`group relative p-3.5 rounded-[var(--radius-lg)] border-2 transition-all cursor-pointer overflow-hidden ${
                    activeVoice.id === voice.id 
                    ? 'bg-blue-50/50 border-blue-500 shadow-sm' 
                    : 'bg-[var(--bg-panel)] border-[var(--border-color)] hover:border-blue-200 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full ${voice.bg} flex items-center justify-center shrink-0`}>
                        <User className={`icon-md ${voice.text}`} />
                      </div>
                      <div>
                        <h4 className="text-[14px] font-bold text-[var(--text-main)] leading-none mb-1.5 flex items-center">
                          {voice.name}
                          {activeVoice.id === voice.id && (
                            <div className="ml-2 flex items-center space-x-0.5">
                              <span className="w-1 h-3 bg-blue-500 rounded-full animate-[pulse_1s_ease-in-out_infinite]"></span>
                              <span className="w-1 h-4 bg-blue-500 rounded-full animate-[pulse_1.2s_ease-in-out_infinite_0.2s]"></span>
                              <span className="w-1 h-2 bg-blue-500 rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.4s]"></span>
                            </div>
                          )}
                        </h4>
                        <div className="flex items-center text-[11px] text-[var(--text-muted)] font-medium space-x-2">
                          <span className="flex items-center"><Globe className="w-3 h-3 mr-0.5 opacity-70" />{voice.lang}</span>
                          <span>•</span>
                          <span>{voice.gender}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center space-x-1.5 flex-wrap">
                    {voice.tags.map(tag => (
                      <span key={tag} className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${activeVoice.id === voice.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-[var(--border-color)]" />

          {/* History */}
          <div className="p-5 pb-8">
            <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-4">生成记录</h3>
            <div className="space-y-2">
              {MOCK_HISTORY.map(item => (
                <div key={item.id} className="p-3 rounded-[var(--radius-lg)] hover:bg-gray-50 border border-transparent hover:border-[var(--border-color)] transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-[13px] font-bold text-[var(--text-main)] line-clamp-1 flex-1 pr-2">{item.title}</h4>
                    <span className="text-[11px] font-black text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{item.duration}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-[var(--text-muted)] font-medium">
                    <span className="flex items-center"><User className="w-3 h-3 mr-1" /> {item.voice}</span>
                    <span>{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-gray-50/30">
        <div className="flex-1 overflow-y-auto p-[var(--spacing-lg)] md:p-[var(--spacing-xl)] custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-[var(--spacing-lg)]">
            
            {/* Header controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-[var(--radius-lg)] ${activeVoice.bg} flex items-center justify-center shadow-sm border border-white/50`}>
                  <AudioLines className={`icon-lg ${activeVoice.text}`} />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight flex items-center space-x-2">
                    <span>{activeVoice.name}</span>
                    <span className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full">Pro</span>
                  </h1>
                  <p className="text-[13px] text-[var(--text-muted)] font-medium">{activeVoice.type} · Gemini 语音合成大模型</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="px-4 py-2 bg-[var(--bg-panel)] text-gray-700 text-[13px] font-bold rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-gray-300 shadow-sm transition-all flex items-center space-x-2">
                  <History className="icon-sm text-gray-400" />
                  <span>历史版本</span>
                </button>
                <button className="px-4 py-2 bg-[var(--bg-panel)] text-gray-700 text-[13px] font-bold rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-gray-300 shadow-sm transition-all items-center space-x-2 hidden sm:flex">
                  <Settings2 className="icon-sm text-gray-400" />
                  <span>高级设置</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--spacing-md)]">
              {/* Text Input Area / Script Editor */}
              <div className="lg:col-span-2 space-y-[var(--spacing-md)]">
                
                {/* Mode Toggle */}
                <div className="flex bg-gray-100/80 p-1 rounded-[var(--radius-lg)] w-fit border border-[var(--border-color)]/50">
                  <button 
                    onClick={() => setMode('single')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${mode === 'single' ? 'bg-[var(--bg-panel)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-gray-700'}`}
                  >
                    <FileText className="icon-sm" />
                    <span>单段文本</span>
                  </button>
                  <button 
                    onClick={() => setMode('batch')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${mode === 'batch' ? 'bg-[var(--bg-panel)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-gray-700'}`}
                  >
                    <Layers className="icon-sm" />
                    <span>多角色脚本</span>
                    <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded ml-1 scale-90">Beta</span>
                  </button>
                </div>
                
                <div className="flex bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-3 items-center justify-between shadow-sm">
                   <div className="flex items-center">
                      <Globe className="icon-sm text-blue-500 mr-2" />
                      <span className="text-[13px] font-bold text-gray-700">输出语种设置</span>
                   </div>
                   <select className="bg-gray-50 border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-[12px] font-medium text-gray-700 focus:outline-none focus:border-blue-500">
                     <option>自动识别 (Auto)</option>
                     <option>简体中文</option>
                     <option>English</option>
                     <option>日本語</option>
                     <option>한국어</option>
                     <option>Français</option>
                   </select>
                </div>

                {mode === 'single' ? (
                  <div className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-sm overflow-hidden flex flex-col h-[400px] focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-400 transition-all">
                    <div className="p-3 border-b border-[var(--border-color)] flex items-center justify-between bg-gray-50/50">
                       <span className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">文本输入区域</span>
                       <button className="text-[12px] text-[var(--color-primary)] font-bold flex items-center hover:text-blue-700">
                          <Wand2 className="w-3.5 h-3.5 mr-1" />
                          AI 润色文本
                       </button>
                    </div>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="输入需要转换为语音的文本..."
                      className="flex-1 w-full p-5 text-[15px] leading-relaxed text-[var(--text-main)] bg-transparent outline-none resize-none custom-scrollbar"
                    />
                    <div className="p-3 bg-gray-50/50 border-t border-[var(--border-color)] flex justify-between items-center px-5">
                      <span className="text-[12px] font-bold text-gray-400">{text.length} 字符</span>
                      <button className="text-gray-400 hover:text-red-500 transition-colors p-1" onClick={() => setText('')} title="清空文本">
                        <Trash2 className="icon-sm" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-sm overflow-hidden flex flex-col h-[400px]">
                    <div className="p-3 border-b border-[var(--border-color)] flex items-center justify-between bg-gray-50/50 shrink-0">
                       <span className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">多角色对话脚本</span>
                       <button className="text-[12px] text-[var(--color-primary)] font-bold flex items-center hover:text-blue-700">
                          <SplitSquareVertical className="w-3.5 h-3.5 mr-1" />
                          导入剧本
                       </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 bg-gray-50/30">
                      {scriptLines.map((line, index) => {
                         const voice = VOICES.find(v => v.id === line.voiceId) || VOICES[0];
                         return (
                           <div key={line.id} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-3 pl-2 flex gap-2 group shadow-sm hover:border-blue-300 transition-colors">
                             <div className="flex flex-col items-center justify-start pt-1 space-y-2">
                               <div className="cursor-grab text-gray-300 hover:text-[var(--text-muted)] transition-colors">
                                  <GripVertical className="icon-sm" />
                               </div>
                               <div className="icon-lg rounded-full bg-gray-100 flex items-center justify-center shrink-0 font-bold text-[var(--text-muted)] text-[10px] border border-[var(--border-color)]">
                                 {index + 1}
                               </div>
                             </div>
                             <div className="flex-1 space-y-2 relative">
                               <div className="flex items-center gap-2">
                                 <input 
                                   type="text" 
                                   value={line.role}
                                   onChange={(e) => updateScriptLine(line.id, 'role', e.target.value)}
                                   placeholder="角色名"
                                   className="w-24 text-[13px] font-bold border-b border-dashed border-gray-300 focus:border-blue-500 outline-none pb-0.5 bg-transparent"
                                 />
                                 <div className="relative flex-1 max-w-[140px]">
                                   <select 
                                     value={line.voiceId}
                                     onChange={(e) => updateScriptLine(line.id, 'voiceId', e.target.value)}
                                     className="w-full text-[12px] bg-gray-50 border border-[var(--border-color)] rounded-lg px-2 py-1 outline-none appearance-none font-medium focus:border-blue-500 pr-6 cursor-pointer"
                                   >
                                     {VOICES.map(v => (
                                       <option key={v.id} value={v.id}>{v.name} ({v.gender})</option>
                                     ))}
                                   </select>
                                   <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-1.5 pointer-events-none" />
                                 </div>
                                 <button 
                                   onClick={() => updateScriptLine(line.id, 'showSettings', !line.showSettings)}
                                   className={`p-1.5 rounded-lg transition-colors ml-auto ${line.showSettings ? 'bg-blue-100 text-[var(--color-primary)]' : 'text-gray-400 hover:bg-gray-100'}`}
                                   title="高级参数"
                                 >
                                   <Settings2 className="w-3.5 h-3.5" />
                                 </button>
                               </div>
                               
                               {line.showSettings && (
                                 <div className="bg-gray-50 border border-[var(--border-color)] rounded-lg p-3 space-y-3 mb-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                   <div className="flex items-center gap-[var(--spacing-md)]">
                                     <div className="flex-1 space-y-1.5">
                                       <div className="flex justify-between text-[10px] font-bold text-[var(--text-muted)]">
                                          <span>语速 ({line.speed}x)</span>
                                       </div>
                                       <input 
                                         type="range" min="0.5" max="2.0" step="0.1" 
                                         value={line.speed}
                                         onChange={(e) => updateScriptLine(line.id, 'speed', parseFloat(e.target.value))}
                                         className="w-full h-1 bg-gray-200 rounded-full appearance-none accent-blue-500"
                                       />
                                     </div>
                                     <div className="flex-1 space-y-1.5">
                                       <div className="flex justify-between text-[10px] font-bold text-[var(--text-muted)]">
                                          <span>段后停顿 ({line.pause}s)</span>
                                       </div>
                                       <input 
                                         type="range" min="0" max="3" step="0.1" 
                                         value={line.pause}
                                         onChange={(e) => updateScriptLine(line.id, 'pause', parseFloat(e.target.value))}
                                         className="w-full h-1 bg-gray-200 rounded-full appearance-none accent-blue-500"
                                       />
                                     </div>
                                   </div>
                                   <div className="pt-2 border-t border-[var(--border-color)]/50">
                                      <div className="flex justify-between text-[10px] font-bold text-[var(--text-muted)] mb-1.5">
                                         <span>情感预设</span>
                                      </div>
                                      <div className="flex gap-2">
                                        {['neutral', 'happy', 'sad', 'angry'].map(emotion => (
                                          <button 
                                            key={emotion}
                                            onClick={() => updateScriptLine(line.id, 'emotion', emotion)}
                                            className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                                              (line.emotion || 'neutral') === emotion 
                                                ? 'bg-blue-500 text-white shadow-sm' 
                                                : 'bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-600 hover:border-blue-300'
                                            }`}
                                          >
                                            {emotion === 'neutral' ? '平静' : emotion === 'happy' ? '开心' : emotion === 'sad' ? '悲伤' : '愤怒'}
                                          </button>
                                        ))}
                                      </div>
                                   </div>
                                 </div>
                               )}

                               <textarea
                                 value={line.text}
                                 onChange={(e) => updateScriptLine(line.id, 'text', e.target.value)}
                                 placeholder="输入此角色的台词..."
                                 className="w-full text-[14px] leading-relaxed text-[var(--text-main)] bg-transparent outline-none resize-none field-sizing-content min-h-[44px]"
                                 rows={1}
                                 onInput={(e) => {
                                   const target = e.target as HTMLTextAreaElement;
                                   target.style.height = 'auto';
                                   target.style.height = `${target.scrollHeight}px`;
                                 }}
                               />
                               <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 flex items-center bg-[var(--bg-panel)]/80 backdrop-blur-sm rounded-md shadow-sm border border-[var(--border-color)] transition-opacity">
                                 <button 
                                   onClick={() => {}}
                                   className="p-1.5 text-gray-400 hover:text-[var(--color-primary)] hover:bg-blue-50 rounded-l-md transition-all border-r border-[var(--border-color)]"
                                   title="试听此行"
                                 >
                                   <Play className="w-3.5 h-3.5" />
                                 </button>
                                 <button 
                                   onClick={() => removeScriptLine(line.id)}
                                   className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-r-md transition-all"
                                   title="删除此行"
                                 >
                                   <Trash2 className="w-3.5 h-3.5" />
                                 </button>
                               </div>
                             </div>
                           </div>
                         );
                      })}
                      <button 
                        onClick={addScriptLine}
                        className="w-full py-3 border-2 border-dashed border-[var(--border-color)] rounded-[var(--radius-lg)] text-[13px] font-bold text-[var(--text-muted)] hover:text-[var(--color-primary)] hover:border-blue-300 hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="icon-sm" />
                        <span>添加对白行</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Voice Parameters Area */}
              <div className="space-y-[var(--spacing-md)]">
                <div className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-sm p-5 space-y-[var(--spacing-lg)]">
                  <div>
                    <h3 className="text-[13px] font-black text-[var(--text-main)] mb-4 flex items-center">
                      <Settings2 className="icon-sm mr-2 text-gray-400" />
                      声纹参数调节
                    </h3>
                    
                    {/* Speed Slider */}
                    <div className="space-y-2 mb-5">
                      <div className="flex justify-between text-[12px]">
                        <span className="font-bold text-gray-600">语速控制 (Speed)</span>
                        <span className="font-black text-[var(--color-primary)]">{speed.toFixed(1)}x</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.5" max="2.0" step="0.1"
                        value={speed}
                        onChange={(e) => setSpeed(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    {/* Stability Slider */}
                    <div className="space-y-2 mb-5">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-bold text-gray-600">情感稳定性 (Stability)</span>
                        <span className="font-black text-[var(--color-primary)]">{Math.round(stability * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="1" step="0.05"
                        value={stability}
                        onChange={(e) => setStability(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <p className="text-[10px] text-gray-400 font-medium">降低稳定性可获得更丰富的语气起伏。</p>
                    </div>

                    {/* Clarity Slider */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-bold text-gray-600">咬字清晰度 (Clarity)</span>
                        <span className="font-black text-[var(--color-primary)]">{Math.round(clarity * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="1" step="0.05"
                        value={clarity}
                        onChange={(e) => setClarity(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <p className="text-[10px] text-gray-400 font-medium">增加可减少底噪并强化语音特征。</p>
                    </div>
                  </div>
                  
                  <hr className="border-[var(--border-color)]" />
                  
                  <div className="flex items-center justify-between bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
                    <span className="text-[12px] font-bold text-blue-800">扣除配额预估</span>
                    <span className="text-[14px] font-black text-[var(--color-primary)]">{Math.ceil(text.length / 10)} 点</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Audio Player & Control Bar */}
        <div className="h-24 bg-[var(--bg-panel)] border-t border-[var(--border-color)] flex items-center justify-between px-6 md:px-10 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] shrink-0">
          <div className="flex-1 flex items-center">
             <button 
               onClick={togglePlay}
               className={`w-14 h-14 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-md ${
                 isGenerating 
                 ? 'bg-gray-100 cursor-not-allowed' 
                 : 'bg-[var(--color-primary)] hover:bg-blue-700 text-white'
               }`}
             >
               {isGenerating ? (
                 <div className="icon-md border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
               ) : isPlaying ? (
                 <Pause className="icon-lg fill-current" />
               ) : (
                 <Play className="icon-lg fill-current ml-1" />
               )}
             </button>
             
             <div className="ml-6 flex-1 max-w-2xl hidden md:flex items-center space-x-4">
                <span className="text-[12px] font-black text-gray-400 w-10 text-right">
                  {isPlaying ? '0:12' : '0:00'}
                </span>
                
                {/* Simulated Audio Waveform / Progress */}
                <div className="flex-1 h-12 relative flex items-center justify-center group cursor-pointer" ref={progressRef}>
                  <div className="absolute inset-x-0 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-300 w-0" style={{ width: isPlaying ? '40%' : audioReady ? '100%' : '0%' }}></div>
                  </div>
                  
                  {/* Waveform Visualization (Mock) */}
                  {(audioReady || isPlaying) && (
                    <div className="absolute inset-0 flex items-center justify-between px-1 pointer-events-none opacity-40 mix-blend-multiply">
                      {Array.from({ length: 48 }).map((_, i) => (
                        <div 
                          key={i} 
                          className="w-1 bg-blue-400 rounded-full transition-all"
                          style={{ 
                            height: isPlaying ? `${Math.max(4, Math.random() * 32)}px` : '4px',
                            transitionDuration: '100ms'
                          }}
                        ></div>
                      ))}
                    </div>
                  )}
                </div>
                
                <span className="text-[12px] font-black text-gray-400 w-10">
                  {audioReady ? '0:34' : '--:--'}
                </span>
             </div>
          </div>
          
          <div className="flex items-center space-x-3 ml-6 border-l border-[var(--border-color)] pl-6 h-12">
            <button
               onClick={handleGenerate}
               disabled={!text.trim() || isGenerating}
               className="bg-gray-900 hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3.5 rounded-[var(--radius-lg)] font-bold text-[14px] transition-all flex items-center space-x-2"
            >
              <Sparkles className="icon-sm" />
              <span>{isGenerating ? '正在合成...' : '生成语音'}</span>
            </button>
            <button 
              disabled={!audioReady}
              className="w-12 h-12 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:border-blue-400 hover:text-[var(--color-primary)] text-[var(--text-muted)] flex items-center justify-center rounded-[var(--radius-lg)] transition-all disabled:opacity-50 disabled:cursor-not-allowed tooltip tooltip-top"
              title="下载音频 (WAV)"
            >
              <Download className="icon-md" />
            </button>
            <button 
              disabled={!audioReady}
              className="w-12 h-12 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:border-gray-400 text-[var(--text-muted)] flex items-center justify-center rounded-[var(--radius-lg)] transition-all disabled:opacity-50 disabled:cursor-not-allowed tooltip tooltip-top"
              title="分享项目"
            >
              <Share2 className="icon-md" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
