import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Key, Plus, Copy, Trash2, Eye, EyeOff, Activity, Code, Webhook, Shield, CheckCircle2, AlertCircle, RefreshCcw, Download, X, AlertTriangle } from 'lucide-react';

export function ApiKeysView() {
  const [activeTab, setActiveTab] = useState('keys'); // keys, webhooks, analytics
  const [keys, setKeys] = useState([
    { id: '1', name: 'Production Backend', key: 'sk-prod-9a8b7c********************1x2y3z', created: '2026-01-15', lastUsed: '10 分钟前', status: '正常', warning: null },
    { id: '2', name: 'Testing Env', key: 'sk-test-qwerty********************456789', created: '2026-03-22', lastUsed: '2 天前', status: '正常', warning: '即将过期' },
    { id: '3', name: 'Jenkins CI/CD', key: 'sk-ci-asdfgh********************098765', created: '2026-05-10', lastUsed: '从未', status: '正常', warning: '30天未使用' },
  ]);

  const [showGenModal, setShowGenModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState('');
  
  const [showRotateConfirmModal, setShowRotateConfirmModal] = useState(false);
  const [keyToRotate, setKeyToRotate] = useState<{id: string, name: string} | null>(null);
  
  const [showExportModal, setShowExportModal] = useState(false);

  const handleGenerateKey = () => {
    if (!newKeyName) return;
    const rand = Math.random().toString(36).substring(2, 15);
    const fullKey = `sk-${newKeyName.toLowerCase().replace(/\s+/g, '-')}-${rand}********************`;
    
    setNewlyGeneratedKey(fullKey);
    setTimeout(() => {
      setKeys([{ id: Date.now().toString(), name: newKeyName, key: fullKey, created: '刚刚', lastUsed: '从未', status: '正常' }, ...keys]);
    }, 500);
  };

  const closeGenModal = () => {
    setShowGenModal(false);
    setNewKeyName('');
    setNewlyGeneratedKey('');
  };

  const copyToClipboard = (text: string) => {
    // In a real app we'd use navigator.clipboard.writeText
    alert('已复制到剪贴板！');
  };

  const confirmRotateKey = (id: string, name: string) => {
    setKeyToRotate({ id, name });
    setShowRotateConfirmModal(true);
  };

  const executeRotateKey = () => {
    if (!keyToRotate) return;
    const { id, name } = keyToRotate;
    const rand = Math.random().toString(36).substring(2, 15);
    const fullKey = `sk-${name.toLowerCase().replace(/\s+/g, '-')}-${rand}********************`;
    
    setKeys(keys.map(k => {
      if (k.id === id) {
        return { ...k, status: '将在 24s 时后过期', name: `${k.name} (旧)` };
      }
      return k;
    }));
    
    setTimeout(() => {
      setKeys(prev => [{ id: Date.now().toString(), name: name, key: fullKey, created: '刚刚', lastUsed: '从未', status: '正常', warning: null }, ...prev]);
      setShowRotateConfirmModal(false);
      setKeyToRotate(null);
    }, 500);
  };

  return (
    <div className="p-[var(--spacing-xl)] max-w-6xl mx-auto animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-[var(--spacing-xl)]">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2 mt-1">API 密钥与开发者中心</h2>
          <p className="text-[var(--text-muted)] text-sm">管理您的应用程序 API 访问凭证，配置回调 Webhooks 并查看调用限制。</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-[var(--radius-lg)] w-fit mb-[var(--spacing-xl)]">
        <button 
          onClick={() => setActiveTab('keys')}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'keys' ? 'bg-[var(--bg-panel)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-gray-700'}`}
        >
          <div className="flex items-center space-x-2"><Key className="icon-sm" /><span>API 密钥</span></div>
        </button>
        <button 
          onClick={() => setActiveTab('webhooks')}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'webhooks' ? 'bg-[var(--bg-panel)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-gray-700'}`}
        >
          <div className="flex items-center space-x-2"><Webhook className="icon-sm" /><span>回调 Webhooks</span></div>
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'analytics' ? 'bg-[var(--bg-panel)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-gray-700'}`}
        >
          <div className="flex items-center space-x-2"><Activity className="icon-sm" /><span>接口调用大盘</span></div>
        </button>
      </div>

      {activeTab === 'keys' && (
        <div className="space-y-[var(--spacing-lg)] animate-in slide-in-from-bottom-2 duration-300">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-[var(--radius-xl)] p-[var(--spacing-lg)] flex items-start justify-between">
            <div className="flex items-start">
               <div className="mt-1 bg-blue-100 text-[var(--color-primary)] p-2 rounded-[var(--radius-lg)] mr-4">
                  <Shield className="icon-md" />
               </div>
               <div>
                  <h3 className="font-bold text-blue-900 text-[15px] mb-1">保护您的凭证安全</h3>
                  <p className="text-sm text-blue-800/70 max-w-2xl leading-relaxed">
                    您的 API 密钥代表了您的超级个体账号最高权限。请勿在客户端代码（如浏览器端 React/Vue）、公开的 GitHub 仓库中明文硬编码保存。建议将密钥存储在后端的环境变量或密钥管理服务中。
                  </p>
               </div>
            </div>
            <button 
              onClick={() => setShowGenModal(true)}
              className="bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-[0_2px_10px_rgba(37,99,235,0.2)] flex items-center shrink-0"
            >
              <Plus className="icon-sm mr-1.5" />
              创建新密钥
            </button>
          </div>

          {keys.some(k => k.warning) && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-orange-50 border border-orange-200 p-4 rounded-[var(--radius-xl)] flex items-start">
              <AlertTriangle className="icon-md text-orange-500 mr-3 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-orange-900 font-bold text-[14px] mb-1.5">系统安全风险提示</h4>
                <div className="space-y-1">
                  {keys.filter(k => k.warning).map(k => (
                    <p key={k.id} className="text-orange-800 text-[13px] font-medium flex items-center">
                      <span className="w-1.5 h-1.5 bg-orange-400 rounded-full mr-2"></span>
                      <span className="font-bold mr-1">{k.name}</span> {k.warning}
                    </p>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)] text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">
                  <th className="py-4 px-6">名称</th>
                  <th className="py-4 px-6">密钥 (Secret Key)</th>
                  <th className="py-4 px-6">创建时间</th>
                  <th className="py-4 px-6">最后使用</th>
                  <th className="py-4 px-6">状态</th>
                  <th className="py-4 px-6 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {keys.map((k, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                       <p className="font-bold text-[15px] text-[var(--text-main)] flex items-center">
                         {k.name}
                         {k.warning && <AlertTriangle className="w-3.5 h-3.5 text-orange-500 ml-2" title={k.warning} />}
                       </p>
                    </td>
                    <td className="py-4 px-6">
                       <div className="flex items-center space-x-3 group">
                         <code className="text-[13px] font-mono text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md border border-[var(--border-color)]">
                           {k.key}
                         </code>
                         <button className="text-gray-400 hover:text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-all font-medium text-xs flex items-center">
                           <Copy className="w-3.5 h-3.5 mr-1" />
                           复制
                         </button>
                       </div>
                    </td>
                    <td className="py-4 px-6 text-[14px] text-[var(--text-muted)] font-medium">{k.created}</td>
                    <td className="py-4 px-6 text-[14px]">
                       <span className="text-[var(--text-muted)] font-medium">{k.lastUsed}</span>
                    </td>
                    <td className="py-4 px-6 text-[14px]">
                       {k.status === '正常' ? (
                          <span className="bg-green-50 text-green-700 text-[11px] font-bold px-2 py-0.5 rounded border border-green-200">正常</span>
                       ) : (
                          <span className="bg-orange-50 text-orange-700 text-[11px] font-bold px-2 py-0.5 rounded border border-orange-200">{k.status}</span>
                       )}
                    </td>
                    <td className="py-4 px-6 text-right space-x-3">
                      {k.status === '正常' && (
                        <button 
                          onClick={() => confirmRotateKey(k.id, k.name)}
                          className="text-[var(--color-primary)] hover:text-blue-800 transition-colors text-sm font-bold flex items-center justify-end w-full mb-1"
                        >
                          <RefreshCcw className="icon-sm mr-1.5" />轮换
                        </button>
                      )}
                      <button className="text-red-500 hover:text-red-700 transition-colors text-sm font-bold flex items-center justify-end w-full">
                        <Trash2 className="icon-sm mr-1.5" />撤销
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'webhooks' && (
        <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-12 text-center animate-in slide-in-from-bottom-2 duration-300">
          <div className="w-16 h-16 bg-blue-50 text-[var(--color-primary)] flex items-center justify-center rounded-[var(--radius-xl)] mx-auto mb-4">
             <Webhook className="icon-xl" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-main)] mb-2">配置工作流回调 Webhooks</h2>
          <p className="text-[var(--text-muted)] max-w-lg mx-auto mb-[var(--spacing-xl)]">
            由于视频生成、AI 模型训练为耗时异步任务。配置接收回调地址，当内容生产完毕后，我们将主动推送数据到您的服务器。
          </p>
          <button className="bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-[var(--radius-lg)] font-bold shadow-sm transition-colors">
            添加 Endpoint (API v2)
          </button>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-[var(--spacing-lg)] animate-in slide-in-from-bottom-2 duration-300">
           <div className="flex justify-end mb-2">
              <button onClick={() => setShowExportModal(true)} className="bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-700 hover:bg-gray-50 px-5 py-2.5 rounded-[var(--radius-lg)] font-bold shadow-sm transition-colors flex items-center text-sm">
                <Download className="icon-sm mr-2" />
                导出用量对账单 (CSV)
              </button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)]">
              <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-[var(--spacing-lg)] shadow-sm">
                 <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">今日总请求量限制</p>
                 <div className="flex items-end mb-2">
                    <p className="text-[var(--text-main)]xl font-black text-[var(--text-main)]">4,281</p>
                    <p className="text-sm font-bold text-[var(--text-muted)] ml-2 mb-1">/ 10,000</p>
                 </div>
                 <div className="w-full bg-gray-100 h-2 rounded-full mt-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '42%' }}></div>
                 </div>
              </div>
              <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-[var(--spacing-lg)] shadow-sm">
                 <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">并发调用线程峰值</p>
                 <div className="flex items-end mb-2">
                    <p className="text-[var(--text-main)]xl font-black text-[var(--text-main)]">24</p>
                    <p className="text-sm font-bold text-[var(--text-muted)] ml-2 mb-1">/ 50 并发最大</p>
                 </div>
                 <div className="w-full bg-gray-100 h-2 rounded-full mt-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '48%' }}></div>
                 </div>
              </div>
              <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-[var(--spacing-lg)] shadow-sm">
                 <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">平均 API 延迟</p>
                 <div className="flex items-end mb-2">
                    <p className="text-[var(--text-main)]xl font-black text-[var(--text-main)]">312<span className="text-lg">ms</span></p>
                 </div>
                 <p className="text-xs font-bold text-green-600 mt-2 flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    P95 数据良好
                 </p>
              </div>
           </div>
           
           <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] mb-[var(--spacing-md)]">
              <h3 className="font-bold text-lg text-[var(--text-main)] mb-[var(--spacing-md)]">实时 API 调用与错误分布</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { time: '00:00', calls: 240, errors: 4 },
                    { time: '04:00', calls: 139, errors: 2 },
                    { time: '08:00', calls: 980, errors: 12 },
                    { time: '12:00', calls: 3908, errors: 45 },
                    { time: '16:00', calls: 4800, errors: 23 },
                    { time: '20:00', calls: 3800, errors: 18 },
                    { time: '24:00', calls: 4300, errors: 9 },
                  ]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="errorsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="calls" name="成功调用" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#callsGrad)" />
                    <Area type="monotone" dataKey="errors" name="异常报错" stroke="#EF4444" strokeWidth={3} fillOpacity={1} fill="url(#errorsGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>
           
           <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] flex items-center justify-between">
              <div className="flex items-center">
                 <Code className="w-10 h-10 text-gray-400 mr-4" />
                 <div>
                    <h3 className="font-bold text-lg text-[var(--text-main)]">官方 API 文档与 SDK 参考</h3>
                    <p className="text-sm text-[var(--text-muted)]">查阅如何使用 Node.js, Python, HTTP/REST 接入我们的智能生成系统。</p>
                 </div>
              </div>
              <button className="text-[var(--color-primary)] font-bold hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 px-5 py-2.5 rounded-[var(--radius-lg)]">
                 阅读研发文档
              </button>
           </div>
        </div>
      )}

      <AnimatePresence>
      {/* Generate Key Modal */}
      {showGenModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-[var(--bg-panel)] w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden relative"
          >
            
            {newlyGeneratedKey ? (
              <div className="p-[var(--spacing-xl)] pb-10 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                   <CheckCircle2 className="icon-xl text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">新的密钥已生成</h3>
                <p className="text-sm text-[var(--text-muted)] mb-[var(--spacing-md)] px-4">
                  请立即复制并妥善保管您的新密钥。为了安全起见，<b>关闭此窗口后您将无法再次查看该密钥。</b>
                </p>
                
                <div className="bg-gray-50 p-4 rounded-[var(--radius-lg)] border border-[var(--border-color)] mb-[var(--spacing-md)] flex flex-col items-center">
                   <code className="text-sm font-mono text-[var(--text-main)] font-bold mb-3 break-all">{newlyGeneratedKey}</code>
                   <button 
                     onClick={() => copyToClipboard(newlyGeneratedKey)}
                     className="bg-[var(--color-primary)] hover:bg-blue-700 text-white w-full py-2.5 rounded-lg font-bold flex items-center justify-center transition-colors"
                   >
                     <Copy className="icon-sm mr-2" />
                     复制密钥内容
                   </button>
                </div>
                
                <button 
                  onClick={closeGenModal}
                  className="text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold text-sm px-6 py-2 transition-colors"
                >
                  我已经保存好了，关闭窗口
                </button>
              </div>
            ) : (
              <div className="p-[var(--spacing-lg)]">
                <div className="mb-[var(--spacing-md)] flex items-center space-x-3 pb-4 border-b border-[var(--border-color)]">
                  <div className="bg-blue-50 text-[var(--color-primary)] w-10 h-10 flex items-center justify-center rounded-[var(--radius-lg)]">
                    <Key className="icon-md" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-main)]">创建新 API 密钥</h3>
                    <p className="text-[13px] text-[var(--text-muted)]">为应用或项目命名，便于您日后管理识别。</p>
                  </div>
                </div>

                <div className="mb-[var(--spacing-xl)]">
                   <label className="block text-sm font-bold text-gray-700 mb-2">
                     密钥名称
                   </label>
                   <input 
                     type="text" 
                     placeholder="例如: 生产环境主服务器" 
                     value={newKeyName}
                     onChange={(e) => setNewKeyName(e.target.value)}
                     className="w-full border border-[var(--border-color)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-[var(--radius-lg)] px-4 py-3 outline-none transition-all font-medium text-[15px]" 
                     autoFocus
                   />
                </div>

                <div className="flex space-x-3 justify-end">
                   <button 
                     onClick={closeGenModal}
                     className="px-5 py-2.5 rounded-[var(--radius-lg)] text-gray-600 font-bold hover:bg-gray-100 transition-colors bg-[var(--bg-panel)] border border-[var(--border-color)]"
                   >
                     取消
                   </button>
                   <button 
                     disabled={!newKeyName}
                     onClick={handleGenerateKey}
                     className="bg-[var(--color-primary)] hover:bg-blue-700 text-white disabled:opacity-50 disabled:hover:bg-[var(--color-primary)] px-6 py-2.5 rounded-[var(--radius-lg)] font-bold transition-all shadow-sm"
                   >
                     生成密钥
                   </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Rotate Key Confirm Modal */}
      <AnimatePresence>
        {showRotateConfirmModal && keyToRotate && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-[var(--bg-panel)] w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden relative p-[var(--spacing-lg)]"
            >
              <div className="mb-[var(--spacing-md)] flex items-start space-x-4">
                <div className="bg-orange-100 text-orange-600 w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full">
                  <RefreshCcw className="icon-lg" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-main)] mb-1">确认轮换 API 密钥</h3>
                  <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
                    您将为 <span className="font-bold text-[var(--text-main)]">{keyToRotate.name}</span> 生成一个新的密钥。旧密钥将在 <span className="font-bold text-[var(--text-main)]">24 小时</span> 后自动失效，请在此期间完成业务代码的凭证替换操作以避免服务中断。
                  </p>
                </div>
              </div>
              <div className="flex space-x-3 justify-end mt-8">
                 <button 
                   onClick={() => setShowRotateConfirmModal(false)}
                   className="px-5 py-2.5 rounded-[var(--radius-lg)] text-gray-600 font-bold hover:bg-gray-100 transition-colors bg-[var(--bg-panel)] border border-[var(--border-color)] w-full sm:w-auto"
                 >
                   取消
                 </button>
                 <button 
                   onClick={executeRotateKey}
                   className="bg-[var(--color-primary)] hover:bg-blue-700 text-white px-6 py-2.5 rounded-[var(--radius-lg)] font-bold transition-all shadow-sm w-full sm:w-auto"
                 >
                   确认生成新密钥
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export CSV Modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-[var(--bg-panel)] w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden relative p-[var(--spacing-lg)]"
            >
               <div className="flex justify-between items-center mb-[var(--spacing-md)]">
                 <h3 className="text-xl font-bold text-[var(--text-main)] flex items-center">
                   <Download className="icon-md mr-2 text-[var(--color-primary)]" />
                   导出用量对账单
                 </h3>
                 <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
                   <X className="icon-md" />
                 </button>
               </div>
               
               <div className="space-y-[var(--spacing-md)] mb-[var(--spacing-xl)]">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">对账周期</label>
                    <select className="w-full border border-[var(--border-color)] rounded-[var(--radius-lg)] px-4 py-3 outline-none focus:border-blue-500 text-[14px] font-medium bg-[var(--bg-panel)]">
                      <option>最近 7 天</option>
                      <option>上个月 (2026-04)</option>
                      <option>当月截止至今</option>
                      <option>自定义时间范围...</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">数据颗粒度</label>
                    <div className="flex bg-gray-50 border border-[var(--border-color)] rounded-[var(--radius-lg)] p-1">
                      <button className="flex-1 py-1.5 bg-[var(--bg-panel)] shadow-sm rounded-lg text-sm font-bold text-[var(--text-main)] border border-[var(--border-color)]">按天统计</button>
                      <button className="flex-1 py-1.5 rounded-lg text-sm font-bold text-[var(--text-muted)] hover:text-gray-700">按小时汇总</button>
                    </div>
                  </div>
                  <p className="text-[12px] text-[var(--text-muted)] flex items-start bg-gray-50 p-3 rounded-[var(--radius-lg)] border border-[var(--border-color)]">
                    <span className="text-[16px] mr-1">💡</span> 报表包含按应用级别的 Token 消耗量、调用次数以及失败率统计，方便研发侧审计计费账单。
                  </p>
               </div>
               
               <button 
                 onClick={() => {
                   alert('开始生成导出任务，稍后将会自动下载...');
                   setShowExportModal(false);
                 }}
                 className="w-full bg-gray-900 hover:bg-black text-white px-6 py-3.5 rounded-[var(--radius-lg)] font-bold transition-all shadow-md flex items-center justify-center"
               >
                 <Download className="icon-sm mr-2" />
                 立即生成并下载 CSV
               </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
