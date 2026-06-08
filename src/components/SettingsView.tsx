import React, { useState } from 'react';
import { User, Bell, Shield, Key, Database, Palette, Globe, Smartphone, Check, Copy, Eye, EyeOff, LayoutTemplate, Moon, Sun, Monitor, Lock, Building2, Languages, BookOpen, Radio, Hexagon, Zap } from 'lucide-react';
import { useSessionAutoSave } from '../hooks/useSessionAutoSave';
import { useTheme, ThemeType } from './ThemeProvider';
import { useAmbientSound, AmbientSoundType } from '../hooks/useAmbientSound';
import { Headphones, Volume2 } from 'lucide-react';
import { useDeveloperMode } from '../hooks/useDeveloperMode';

export function SettingsView() {
  const [activeTab, setActiveTab] = useState('profile');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const { theme, setTheme } = useTheme();
  const [previewTheme, setPreviewTheme] = useState<ThemeType | null>(null);
  const { isDevMode, toggleDevMode } = useDeveloperMode();
  const { activeSound, setActiveSound, volume, setVolume } = useAmbientSound();

  const { value: signature, setValue: setSignature, isSaving: isSavingSignature } = useSessionAutoSave('settings_signature_draft', '');

  const tabs = [
    { id: 'profile', icon: User, label: '个人信息' },
    { id: 'workspace', icon: Building2, label: '组织与品牌配置' },
    { id: 'appearance', icon: Palette, label: '界面与配置' },
    { id: 'notifications', icon: Bell, label: '消息通知' },
    { id: 'security', icon: Shield, label: '账号安全' },
    { id: 'api', icon: Key, label: 'API 密钥' },
    { id: 'storage', icon: Database, label: '存储空间' },
  ];

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="p-[var(--spacing-lg)] max-w-5xl mx-auto space-y-8 min-h-[calc(100vh-4rem)]">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)]">系统设置</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">管理您的个人偏好、工作台配置及账户安全。</p>
      </div>

      <div className="flex flex-col md:flex-row gap-[var(--spacing-xl)]">
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map(item => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-4 py-2.5 text-sm font-bold rounded-[var(--radius-lg)] transition-all ${activeTab === item.id ? 'bg-[var(--bg-hover)] text-[var(--color-primary)] shadow-sm border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)] border border-transparent'}`}
              >
                <item.icon className="w-[18px] h-[18px] mr-3 shrink-0" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex-1 min-w-0">
          {activeTab === 'appearance' && (
            <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="p-[var(--spacing-lg)] border-b border-[var(--border-color)]">
                <h3 className="text-lg font-bold text-[var(--text-main)]">界面与区域配置</h3>
                <p className="text-sm text-[var(--text-muted)] mt-1">自定义工作台主题语言和布局习惯</p>
              </div>
              <div className="p-[var(--spacing-xl)] space-y-8">
                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-4 flex items-center justify-between">
                     <span>色彩主题 (Live Preview)</span>
                     <span className="text-xs font-normal text-gray-400">Hover to preview / Click to apply globally</span>
                   </label>
                   
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-[var(--spacing-md)] mb-[var(--spacing-xl)]">
                     {[
                       { id: 'light', name: 'Light Form', desc: 'Default minimal', icon: Sun, iconColor: 'text-amber-500', iconBg: 'bg-amber-50' },
                       { id: 'midnight', name: 'Midnight', desc: 'Deep dark', icon: Moon, iconColor: 'text-indigo-400', iconBg: 'bg-indigo-900/30' },
                       { id: 'sepia', name: 'Sepia', desc: 'Warm reading', icon: BookOpen, iconColor: 'text-amber-700', iconBg: 'bg-amber-100' },
                       { id: 'neon', name: 'Neon Contrast', desc: 'High visibility', icon: Zap, iconColor: 'text-emerald-500', iconBg: 'bg-emerald-900/30' },
                       { id: 'cyberpunk', name: 'Cyberpunk', desc: 'Synth wave', icon: Radio, iconColor: 'text-fuchsia-500', iconBg: 'bg-fuchsia-900/30' },
                       { id: 'google', name: 'Material Blue', desc: 'Google styling', icon: Hexagon, iconColor: 'text-[#1A73E8]', iconBg: 'bg-blue-50' },
                     ].map(t => {
                        const IconComp = t.icon;
                        return (
                        <button 
                          key={t.id}
                          onClick={(e) => { e.preventDefault(); setTheme(t.id as ThemeType); }}
                          onMouseEnter={() => setPreviewTheme(t.id as ThemeType)}
                          onMouseLeave={() => setPreviewTheme(null)}
                          className={`relative flex flex-col items-center justify-center text-center p-[var(--spacing-md)] rounded-[var(--radius-xl)] border-2 transition-all flex-1 group ${theme === t.id ? 'border-blue-600 bg-blue-50/30 ring-4 ring-blue-500/10' : 'border-[var(--border-color)] hover:border-[var(--color-primary)] bg-[var(--bg-panel)]'}`}
                        >
                          {theme === t.id && (
                            <div className="absolute top-3 right-3 text-[var(--color-primary)] z-20">
                              <Check className="icon-md drop-shadow-md" />
                            </div>
                          )}
                          <div className="theme-preview w-full h-24 mb-3 rounded-[var(--radius-lg)] overflow-hidden border border-[var(--border-color)] flex flex-col bg-[var(--bg-app)] pointer-events-none transition-all shadow-sm group-hover:scale-[1.02]" data-theme={t.id}>
                            <div className="h-4 flex items-center px-1.5 bg-[var(--bg-panel)] border-b border-[var(--border-color)] justify-between">
                              <div className="flex gap-0.5"><div className="w-1.5 h-1.5 rounded-full bg-red-400"></div><div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div><div className="w-1.5 h-1.5 rounded-full bg-green-400"></div></div>
                              <div className="w-8 h-1.5 rounded-full bg-[var(--color-primary)] opacity-50"></div>
                            </div>
                            <div className="flex-1 flex gap-1.5 p-1.5">
                              <div className="w-1/4 h-full bg-[var(--bg-panel)] rounded-sm border border-[var(--border-color)]"></div>
                              <div className="w-3/4 h-full flex flex-col gap-1.5">
                                 <div className="h-1/3 w-full bg-[var(--bg-panel)] rounded-sm border border-[var(--border-color)] flex items-center px-2"><div className="w-3 h-3 rounded bg-[var(--color-primary)] opacity-20"></div></div>
                                 <div className="flex-1 w-full flex gap-1.5">
                                   <div className="block w-1/2 h-full bg-[var(--bg-panel)] rounded-sm border border-[var(--border-color)]"></div>
                                   <div className="block w-1/2 h-full bg-[var(--bg-panel)] rounded-sm border border-[var(--border-color)]"></div>
                                 </div>
                              </div>
                            </div>
                          </div>
                          <span className="text-[14px] font-bold text-[var(--text-main)] z-10 relative">{t.name}</span>
                          <span className="text-[11px] text-[var(--text-muted)] mt-0.5 z-10 relative">{t.desc}</span>
                        </button>
                     )})}
                   </div>
                   
                   <div className="mb-[var(--spacing-xl)]">
                     <p className="text-sm font-bold text-gray-700 mb-3">区域效果预览</p>
                     <div 
                       className="theme-preview w-full rounded-[var(--radius-xl)] border border-[var(--border-color)] overflow-hidden shadow-sm flex flex-col relative transition-all duration-300 h-[220px]" 
                       data-theme={previewTheme || theme}
                       data-invert-ignore="false"
                     >
                       <div className="flex-1 bg-[var(--bg-panel)] p-[var(--spacing-lg)] relative z-10 transition-colors duration-300">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-lg font-bold text-[var(--text-main)] mb-2">Live Theme Overview</div>
                              <p className="text-sm text-[var(--text-muted)] max-w-sm">
                                This container demonstrates how common UI elements, components, and text contrasts will appear under the active theme.
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <span className="px-3 py-1 bg-[var(--color-primary)] text-white rounded-lg text-xs font-bold shadow-sm">Primary label</span>
                              <span className="px-3 py-1 bg-[var(--bg-hover)] text-[var(--text-main)] rounded-lg text-xs font-bold border border-[var(--border-color)]">Secondary</span>
                            </div>
                          </div>
                          
                          <div className="mt-8 flex items-center gap-[var(--spacing-md)]">
                            <div className="h-[42px] px-4 bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-muted)] rounded-[var(--radius-lg)] flex items-center shadow-sm w-64 text-sm">
                               Placeholder Text...
                            </div>
                            <button className="px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-sm rounded-[var(--radius-lg)] shadow-sm">
                               Action Button
                            </button>
                            <button className="px-5 py-2.5 bg-[var(--bg-panel)] border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--bg-hover)] font-bold text-sm rounded-[var(--radius-lg)] shadow-sm">
                               Cancel
                            </button>
                          </div>
                       </div>
                     </div>
                   </div>
                   
                   <div className="mb-[var(--spacing-xl)]">
                     <p className="text-sm font-bold text-[var(--text-main)] mb-3">排版对比测试 (Typography Reference)</p>
                     <div className="bg-[var(--bg-panel)] p-6 rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-[var(--shadow-md)]">
                        <div className="space-y-6">
                          <div>
                             <h1 className="text-h1">H1 黑体标题 (text-h1)</h1>
                             <p className="text-sub mt-2">Display Heading · 用于最主要的宣传语或英雄区展示</p>
                          </div>
                          <hr className="border-[var(--border-color)] border-dashed" />
                          <div>
                             <h2 className="text-h2">H2 加粗标题 (text-h2)</h2>
                             <p className="text-sub mt-1">Section Heading · 用于页面重要模块或区域分割</p>
                          </div>
                          <div>
                             <h3 className="text-h3">H3 次级标题 (text-h3)</h3>
                             <p className="text-sub">Card Heading · 卡片及弹窗主要标题文字</p>
                          </div>
                          <div>
                             <h4 className="text-h4">H4 小标题 (text-h4)</h4>
                             <p className="text-sub">Item Title · 列表项或细节标题</p>
                          </div>
                          <div className="pt-4 border-t border-[var(--border-color)] space-y-4">
                             <p className="text-body">Body Txt: 我们探索如何使用最佳排版和布局，使得无论在 Light 或 Midnight 主题下，整体可读性与边界清晰度都能得以良好保持。依靠原生的 CSS Variables 将更好地释放我们构建的想象空间。</p>
                             <p className="text-sub">Sub Txt: 我们探索如何使用最佳排版和布局，使得无论在 Light 或 Midnight 主题下...</p>
                             <p className="text-micro">MICRO TXT: GLOBAL FONT SYSTEM</p>
                          </div>
                        </div>
                     </div>
                   </div>
                 </div>

                 <hr className="border-[var(--border-color)]" />

                 <div className="flex items-center justify-between">
                   <div>
                     <p className="font-bold text-[15px] text-[var(--text-main)] flex items-center"><Globe className="w-[18px] h-[18px] mr-2 text-[var(--text-muted)]" /> 默认语言</p>
                     <p className="text-sm text-[var(--text-muted)] mt-1 pl-[26px]">设定系统全局默认交互语言，所有模块将优先采用此语言</p>
                   </div>
                   <select className="px-4 py-2.5 border border-[var(--border-color)] rounded-[var(--radius-lg)] text-sm font-bold shadow-sm focus:ring-blue-500 outline-none bg-[var(--bg-panel)]">
                     <option>🇨🇳 简体中文</option>
                     <option>🇹🇼 繁體中文</option>
                     <option>🇺🇸 English (US)</option>
                     <option>🇯🇵 日本語</option>
                     <option>🇰🇷 한국어</option>
                   </select>
                 </div>
                 
                 <hr className="border-[var(--border-color)]" />

                 <div className="flex items-center justify-between">
                   <div>
                     <p className="font-bold text-[15px] text-[var(--text-main)] flex items-center"><Languages className="w-[18px] h-[18px] mr-2 text-[var(--text-muted)]" /> 全局自动多语支持</p>
                     <p className="text-sm text-[var(--text-muted)] mt-1 pl-[26px]">自动开启已集成模块（如会话监控、语音台等）的多语言转录与翻译功能</p>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                     <input type="checkbox" className="sr-only peer" defaultChecked />
                     <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--bg-panel)] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                   </label>
                 </div>
                 
                 <hr className="border-[var(--border-color)]" />
                 
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="font-bold text-[15px] text-[var(--text-main)] flex items-center"><Smartphone className="w-[18px] h-[18px] mr-2 text-[var(--text-muted)]" /> 紧凑模式</p>
                     <p className="text-sm text-[var(--text-muted)] mt-1 pl-[26px]">在较小的屏幕上显示更多内容</p>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                     <input type="checkbox" className="sr-only peer" />
                     <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--bg-panel)] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                   </label>
                 </div>

                 <hr className="border-[var(--border-color)]" />
                 
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="font-bold text-[15px] text-[var(--text-main)] flex items-center"><Monitor className="w-[18px] h-[18px] mr-2 text-[var(--text-muted)]" /> 开发者模式</p>
                     <p className="text-sm text-[var(--text-muted)] mt-1 pl-[26px]">显示实时系统性能、延迟监控以调试和调整内存优化。</p>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                     <input type="checkbox" className="sr-only peer" checked={isDevMode} onChange={toggleDevMode} />
                     <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--bg-panel)] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                   </label>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="p-[var(--spacing-lg)] border-b border-[var(--border-color)]">
                <h3 className="text-lg font-bold text-[var(--text-main)]">消息与通知</h3>
                <p className="text-sm text-[var(--text-muted)] mt-1">控制您接收的通知类型和渠道</p>
              </div>
              <div className="p-[var(--spacing-xl)]">
                <div className="space-y-[var(--spacing-lg)]">
                  {[
                    { title: '任务进度推送', desc: '当视频或模型训练完成时接收通知', checked: true },
                    { title: '即时协作与提醒', desc: '收到Agent发起的确认、报错或任务完成通知', checked: true },
                    { title: '账单与订阅', desc: '额度耗尽提醒、账单出账和支付成功', checked: true },
                    { title: '营销与活动', desc: '获取新功能发布、活动与优惠信息', checked: false },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between">
                      <div className="pr-10">
                        <p className="font-bold text-[var(--text-main)] mb-1">{item.title}</p>
                        <p className="text-sm text-[var(--text-muted)]">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                        <input type="checkbox" className="sr-only peer" defaultChecked={item.checked} />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--bg-panel)] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                      </label>
                    </div>
                  ))}
                  
                  <hr className="border-[var(--border-color)]" />
                  
                  <div>
                    <h4 className="font-bold text-[var(--text-main)] mb-4">通知方式</h4>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input type="checkbox" className="icon-sm text-[var(--color-primary)] bg-gray-100 border-gray-300 rounded focus:ring-blue-500" defaultChecked />
                        <span className="ml-3 text-sm font-medium text-gray-700">浏览器桌面通知</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="icon-sm text-[var(--color-primary)] bg-gray-100 border-gray-300 rounded focus:ring-blue-500" defaultChecked />
                        <span className="ml-3 text-sm font-medium text-gray-700">邮件通知 (maheshenga@gmail.com)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="p-[var(--spacing-lg)] border-b border-[var(--border-color)]">
                <h3 className="text-lg font-bold text-[var(--text-main)]">账号与安全</h3>
                <p className="text-sm text-[var(--text-muted)] mt-1">管理密码并加强您的账户保护</p>
              </div>
              <div className="p-[var(--spacing-xl)] space-y-8">
                <div className="flex items-center justify-between p-[var(--spacing-md)] bg-gray-50 rounded-[var(--radius-xl)] border border-[var(--border-color)]">
                   <div>
                     <p className="font-bold text-[var(--text-main)] mb-1">登录密码</p>
                     <p className="text-sm text-[var(--text-muted)]">上次修改于 2 个月前</p>
                   </div>
                   <button className="px-5 py-2 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-lg)] text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">修改密码</button>
                </div>
                
                <div className="flex items-center justify-between p-[var(--spacing-md)] bg-gray-50 rounded-[var(--radius-xl)] border border-[var(--border-color)]">
                   <div>
                     <p className="font-bold text-[var(--text-main)] mb-1 flex items-center">
                       双重身份验证 (2FA) 
                       <span className="ml-3 bg-red-100 text-red-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">未开启</span>
                     </p>
                     <p className="text-sm text-[var(--text-muted)]">在登录时需要提供验证码，极大提升账号安全性</p>
                   </div>
                   <button className="px-5 py-2 bg-[var(--color-primary)] text-white rounded-[var(--radius-lg)] text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors">去开启</button>
                </div>

                <div>
                   <h4 className="font-bold text-[var(--text-main)] mb-4">最近登录设备</h4>
                   <div className="space-y-[var(--spacing-md)]">
                     <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
                       <div className="flex items-center">
                         <div className="p-2.5 bg-green-50 text-green-600 rounded-[var(--radius-lg)] mr-4">
                           <Monitor className="icon-md" />
                         </div>
                         <div>
                           <p className="font-bold text-[var(--text-main)] text-[15px]">Mac OS · Chrome <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded font-bold">当前设备</span></p>
                           <p className="text-xs text-[var(--text-muted)] mt-1">IP: 192.168.1.104 · 刚刚</p>
                         </div>
                       </div>
                     </div>
                     <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
                       <div className="flex items-center">
                         <div className="p-2.5 bg-gray-100 text-gray-600 rounded-[var(--radius-lg)] mr-4">
                           <Smartphone className="icon-md" />
                         </div>
                         <div>
                           <p className="font-bold text-[var(--text-main)] text-[15px]">iPhone 14 Pro · Safari</p>
                           <p className="text-xs text-[var(--text-muted)] mt-1">IP: 104.28.19.22 · 昨天 14:32</p>
                         </div>
                       </div>
                       <button className="text-sm font-bold text-red-600 hover:text-red-700">登出</button>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="p-[var(--spacing-lg)] border-b border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-main)]">API 访问密钥</h3>
                  <p className="text-sm text-[var(--text-muted)] mt-1">生成和管理用于程序化访问的 API Keys</p>
                </div>
                <button className="px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-[var(--radius-lg)] text-sm font-bold shadow-sm hover:bg-gray-800 transition-colors">
                  创建新密钥
                </button>
              </div>
              <div className="p-[var(--spacing-xl)]">
                <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-xl)] p-[var(--spacing-md)] mb-[var(--spacing-xl)]">
                  <div className="flex">
                    <Lock className="icon-md text-amber-600 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-amber-800 mb-1">请妥善保管您的密钥</p>
                      <p className="text-xs text-amber-700">密钥一旦创建，只能在控制台查看一次。如若泄露，请立即删除该密钥并重新生成，以免造成损失。</p>
                    </div>
                  </div>
                </div>

                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] text-xs font-extrabold text-gray-400 uppercase tracking-widest">
                      <th className="py-3 px-4">名称</th>
                      <th className="py-3 px-4">Secret Key</th>
                      <th className="py-3 px-4">创建时间</th>
                      <th className="py-3 px-4 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="hover:bg-gray-50/50">
                      <td className="py-4 px-4">
                        <p className="font-bold text-[15px] text-[var(--text-main)]">生产环境网关</p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-600">
                            {showKey ? 'sk-prod-9a8b...7c6d' : 'sk-prod-••••••••••••'}
                          </code>
                          <button onClick={() => setShowKey(!showKey)} className="p-1 hover:bg-gray-200 rounded text-[var(--text-muted)]">
                            {showKey ? <EyeOff className="icon-sm" /> : <Eye className="icon-sm" />}
                          </button>
                          <button onClick={() => copyToClipboard('sk-prod-9a8b11117c6d', 'key1')} className="p-1 hover:bg-gray-200 rounded text-[var(--text-muted)] relative">
                            {copiedKey === 'key1' ? <Check className="icon-sm text-green-600" /> : <Copy className="icon-sm" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-[var(--text-muted)]">2023-10-12</td>
                      <td className="py-4 px-4 text-right">
                        <button className="text-sm font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">删除</button>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50/50">
                      <td className="py-4 px-4">
                        <p className="font-bold text-[15px] text-[var(--text-main)]">开发测试 Token</p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-600">sk-test-••••••••••••</code>
                          <button className="p-1 hover:bg-gray-200 rounded text-[var(--text-muted)] disabled:opacity-50" disabled>
                            <Eye className="icon-sm" />
                          </button>
                          <button onClick={() => copyToClipboard('sk-test-abc', 'key2')} className="p-1 hover:bg-gray-200 rounded text-[var(--text-muted)]">
                            {copiedKey === 'key2' ? <Check className="icon-sm text-green-600" /> : <Copy className="icon-sm" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-[var(--text-muted)]">2024-01-05</td>
                      <td className="py-4 px-4 text-right">
                        <button className="text-sm font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">删除</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'storage' && (
            <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="p-[var(--spacing-lg)] border-b border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-main)]">存储与数据配额</h3>
                  <p className="text-sm text-[var(--text-muted)] mt-1">查看和管理您的订阅计划中的数据限制</p>
                </div>
                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm font-bold border border-blue-100">
                  专业版订阅
                </span>
              </div>
              <div className="p-[var(--spacing-xl)] space-y-8">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-[var(--text-main)] flex items-center"><Database className="icon-md mr-2 text-[var(--text-muted)]" />媒体资产存储</h4>
                    <span className="text-[15px] font-bold text-[var(--text-main)]">45 GB <span className="text-gray-400 font-medium text-sm">/ 100 GB</span></span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden">
                    <div className="bg-[var(--color-primary)] h-3 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] font-medium">使用情况良好，预计可继续存储约 1,200 个高清素材。</p>
                </div>

                <hr className="border-[var(--border-color)]" />

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-[var(--text-main)] flex items-center"><LayoutTemplate className="icon-md mr-2 text-[var(--text-muted)]" />数据分析配额</h4>
                    <span className="text-[15px] font-bold text-[var(--text-main)]">8.2万次 <span className="text-gray-400 font-medium text-sm">/ 10万次</span></span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden">
                    <div className="bg-amber-500 h-3 rounded-full" style={{ width: '82%' }}></div>
                  </div>
                  <p className="text-xs text-amber-600 font-bold bg-amber-50 inline-block px-2 py-1 rounded">接近上限，剩余次数将在本月底 (5月31日) 重置。</p>
                </div>

                <div className="bg-gray-50 p-[var(--spacing-lg)] rounded-[var(--radius-xl)] border border-[var(--border-color)] mt-6 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-[var(--text-main)] mb-1">需要更多资源？</h4>
                    <p className="text-sm text-[var(--text-muted)]">升级您的计划或购买额外的加成包。</p>
                  </div>
                  <button className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-[var(--radius-lg)] text-[15px] font-bold shadow-sm hover:bg-gray-800 transition-colors">
                    升级订阅
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

