import React from 'react';
import { Plus, CheckCircle2, AlertCircle, RefreshCw, Smartphone, TrendingUp, Users } from 'lucide-react';

const accounts = [
  { id: 1, platform: '抖音', name: 'AI 探索者', avatar: 'bg-black', status: 'active', followers: '124.5w', likes: '890w', lastSync: '10分钟前' },
  { id: 2, platform: '小红书', name: '设计美学', avatar: 'bg-red-500', status: 'active', followers: '85.2w', likes: '320w', lastSync: '1小时前' },
  { id: 3, platform: '快手', name: '数字生活', avatar: 'bg-orange-500', status: 'expired', followers: '45.1w', likes: '112w', lastSync: '3天前' },
  { id: 4, platform: 'Bilibili', name: '科技前沿', avatar: 'bg-blue-400', status: 'active', followers: '230w', likes: '1500w', lastSync: '刚刚' },
];

export function MediaAccountsView() {
  return (
    <div className="p-[var(--spacing-lg)] max-w-7xl mx-auto space-y-[var(--spacing-lg)] bg-[var(--bg-app)] min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-color)]">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight flex items-center">
            全域社媒分发神经枢纽 
            <span className="ml-3 bg-purple-100/50 text-purple-600 text-[10px] uppercase font-black px-2.5 py-0.5 rounded shadow-sm border border-purple-200/50">Matrix Node</span>
          </h2>
          <p className="text-[14px] font-medium text-[var(--text-muted)] mt-2">集中管理全网社媒矩阵状态，保障 Agent 集群内容自动分发顺畅无阻。</p>
        </div>
        <button className="flex items-center space-x-2 bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm mt-4 sm:mt-0">
          <Plus className="icon-md" />
          <span>挂载新节点</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)]">
        <div className="bg-[var(--bg-panel)] rounded-[24px] p-[var(--spacing-lg)] border border-[var(--border-color)] shadow-sm flex items-center space-x-5 hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-blue-50 text-[var(--color-primary)] rounded-[var(--radius-xl)] shadow-sm border border-blue-100/50">
            <Smartphone className="w-[22px] h-[22px]" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-[var(--text-muted)]">已绑定账号</p>
            <p className="text-[var(--text-main)]xl font-extrabold text-[var(--text-main)] mt-1">12</p>
          </div>
        </div>
        <div className="bg-[var(--bg-panel)] rounded-[24px] p-[var(--spacing-lg)] border border-[var(--border-color)] shadow-sm flex items-center space-x-5 hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-green-50 text-green-600 rounded-[var(--radius-xl)] shadow-sm border border-green-100/50">
            <Users className="w-[22px] h-[22px]" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-[var(--text-muted)]">全网总粉丝</p>
            <p className="text-[var(--text-main)]xl font-extrabold text-[var(--text-main)] mt-1">484.8w</p>
          </div>
        </div>
        <div className="bg-[var(--bg-panel)] rounded-[24px] p-[var(--spacing-lg)] border border-[var(--border-color)] shadow-sm flex items-center space-x-5 hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-purple-50 text-purple-600 rounded-[var(--radius-xl)] shadow-sm border border-purple-100/50">
            <TrendingUp className="w-[22px] h-[22px]" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-[var(--text-muted)]">本月新增展现量</p>
            <p className="text-[var(--text-main)]xl font-extrabold text-[var(--text-main)] mt-1">+32%</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)]">
                <th className="py-4 px-6 text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">账号信息</th>
                <th className="py-4 px-6 text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">平台</th>
                <th className="py-4 px-6 text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">粉丝数</th>
                <th className="py-4 px-6 text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">状态</th>
                <th className="py-4 px-6 text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">上次同步</th>
                <th className="py-4 px-6 text-[12px] font-extrabold text-gray-400 uppercase tracking-widest text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 ${account.avatar} rounded-full text-white flex items-center justify-center font-bold text-sm shadow-inner`}>
                        {account.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-[var(--text-main)]">{account.name}</p>
                        <p className="text-[13px] text-[var(--text-muted)] font-medium">ID: {Math.floor(Math.random() * 1000000000)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-[15px] font-bold text-gray-700">{account.platform}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="text-[15px] font-bold text-[var(--text-main)]">{account.followers}</span>
                      <span className="text-[13px] text-[var(--text-muted)] font-medium">获赞 {account.likes}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {account.status === 'active' ? (
                      <span className="inline-flex items-center px-2.5 py-1 text-[13px] font-bold text-green-700 bg-green-50 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-green-500" />
                        正常授权
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 text-[13px] font-bold text-red-700 bg-red-50 rounded-md">
                        <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-red-500" />
                        授权过期
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-[14px] text-[var(--text-muted)] font-medium">
                    <div className="flex items-center">
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 opacity-50" />
                      {account.lastSync}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right space-x-4">
                    <button className="text-[var(--color-primary)] hover:text-blue-800 text-[14px] font-bold transition-colors">数据分析</button>
                    {account.status === 'expired' ? (
                      <button className="text-green-600 hover:text-green-800 text-[14px] font-bold transition-colors">重新授权</button>
                    ) : (
                      <button className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-[14px] font-bold transition-colors">设置</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
