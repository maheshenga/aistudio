import React, { useMemo, useState } from 'react';
import { Upload, Search, Filter, Folder, Image as ImageIcon, Video, Music, FileText, MoreVertical, Grid, List, Download, Check, X, Maximize2, FileOutput, Trash2, AlertTriangle, Tag, UserPlus } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from './Toast';
import { useWorkspaceAssets } from '../hooks/useWorkspaceAssets';
import { useSaasSession } from '../saas/SaasAuthContext';
import { preflightCredits, type CreditPreflightResult } from '../lib/billing/creditPreflight';
import {
  createWorkspaceAsset,
  deleteWorkspaceAssets,
  type WorkspaceAsset,
} from '../lib/data/assetRepository';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import { createWorkspaceUsageEvent } from '../lib/data/usageRepository';
import { buildPermissionDeniedMetadata, hasWorkspacePermission } from '../saas/permissions';

const fileTypes = [
  { id: 'all', label: '全部文件' },
  { id: 'image', label: '图片' },
  { id: 'video', label: '视频' },
  { id: 'audio', label: '音频' },
  { id: 'document', label: '文档' }
];

export function AssetsView() {
  const session = useSaasSession();
  const assetContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const canManageAssets = hasWorkspacePermission(session.membership.role, 'assets.manage');
  const assets = useWorkspaceAssets();
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCleanupOpen, setIsCleanupOpen] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAssets(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const handleAssetDragStart = (event: React.DragEvent, asset: WorkspaceAsset) => {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/plain', asset.id);
    event.dataTransfer.setData('application/x-aistudio-asset', asset.id);
  };

  const formatAssetDate = (asset: WorkspaceAsset) => new Date(asset.updatedAt).toISOString().slice(0, 10);

  const logAssetAudit = (
    action: 'asset_create' | 'asset_delete' | 'asset_export',
    metadata: Record<string, unknown>,
    targetId?: string,
  ) => {
    logAuditEvent({
      action,
      moduleId: 'assets',
      targetType: 'asset',
      targetId,
      metadata,
    }, { session });
  };

  const logAssetPermissionDenied = (
    operation: string,
    targetId = operation,
    metadata: Record<string, unknown> = {},
  ) => {
    logAuditEvent({
      action: 'permission_denied',
      moduleId: 'assets',
      targetType: 'asset',
      targetId,
      metadata: {
        ...buildPermissionDeniedMetadata({
          role: session.membership.role,
          permission: 'assets.manage',
          operation,
          moduleId: 'assets',
        }),
        ...metadata,
      },
    }, { session });
    window.dispatchEvent(new Event('activity_logged'));
  };

  const estimateAssetExportCredits = (assetCount: number) => Math.max(1, Math.ceil(assetCount / 5));

  const preflightAssetExport = async (format: 'csv' | 'zip', selectedAssetRecords: WorkspaceAsset[]) => {
    const requestedCredits = estimateAssetExportCredits(selectedAssetRecords.length);
    const result = await preflightCredits({
      workspaceId: session.workspace.id,
      requiredCredits: requestedCredits,
    });

    if (!result.ok) {
      const failure = result as Extract<CreditPreflightResult, { ok: false }>;
      if (failure.reason === 'unavailable') {
        // 导出无后端兜底,核验不到余额时 fail-closed
        toast('无法核验算力额度，请稍后重试。', 'warning');
        return false;
      }

      const remainingCredits = failure.balance ?? 0;
      const overageCredits = Math.max(0, requestedCredits - remainingCredits);
      createWorkspaceUsageEvent({
        moduleId: 'assets',
        kind: 'quota_block',
        targetType: 'asset',
        targetId: selectedAssetRecords.length === 1 ? selectedAssetRecords[0]?.id : 'asset_export',
        credits: 0,
        metadata: {
          format,
          reason: 'quota_exceeded',
          requestedCredits,
          remainingCredits,
          overageCredits,
          assetCount: selectedAssetRecords.length,
          assetIds: selectedAssetRecords.map((asset) => asset.id),
        },
      }, assetContext);
      logAuditEvent({
        action: 'general',
        moduleId: 'billing',
        targetType: 'workspace',
        targetId: session.workspace.id,
        metadata: {
          operation: 'asset_export_quota_block',
          format,
          requestedCredits,
          remainingCredits,
          overageCredits,
          assetCount: selectedAssetRecords.length,
        },
      }, { session });
      toast(`算力额度不足：导出需要 ${requestedCredits} 点，当前剩余 ${remainingCredits} 点。`, 'warning');
      return false;
    }

    return true;
  };

  const recordAssetExportUsage = (format: 'csv' | 'zip', selectedAssetRecords: WorkspaceAsset[]) => {
    createWorkspaceUsageEvent({
      moduleId: 'assets',
      kind: 'export',
      targetType: 'asset',
      targetId: selectedAssetRecords.length === 1 ? selectedAssetRecords[0]?.id : 'asset_export',
      credits: estimateAssetExportCredits(selectedAssetRecords.length),
      metadata: {
        format,
        assetCount: selectedAssetRecords.length,
        assetIds: selectedAssetRecords.map((asset) => asset.id),
      },
    }, assetContext);
  };

  const requireAssetManagement = (
    operation = 'asset_mutation',
    targetId = operation,
    metadata: Record<string, unknown> = {},
  ) => {
    if (canManageAssets) return true;
    logAssetPermissionDenied(operation, targetId, metadata);
    toast('当前角色没有资产管理权限', 'warning');
    return false;
  };

  const handleExportCSV = async () => {
    if (!requireAssetManagement('asset_export', 'asset_export', { format: 'csv', selectedAssetCount: selectedAssets.length })) return;
    if (selectedAssets.length === 0) return;
    const selectedAssetRecords = selectedAssets
      .map(id => assets.find(a => a.id === id))
      .filter((asset): asset is WorkspaceAsset => Boolean(asset));
    if (!(await preflightAssetExport('csv', selectedAssetRecords))) return;

    const headers = ['ID', 'File Name', 'Type', 'Size', 'Date'];
    const rows = selectedAssetRecords.map(asset => (
      `${asset.id},${asset.name},${asset.type},${asset.size},${formatAssetDate(asset)}`
    ));

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + headers.join(',') + "\n"
      + rows.join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "assets_metadata.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    logAssetAudit('asset_export', {
      format: 'csv',
      assetCount: selectedAssetRecords.length,
      assetIds: selectedAssetRecords.map(asset => asset.id),
    }, selectedAssetRecords.length === 1 ? selectedAssetRecords[0]?.id : undefined);
    recordAssetExportUsage('csv', selectedAssetRecords);
    setSelectedAssets([]);
  };

  const handleBulkDownload = async () => {
    if (!requireAssetManagement('asset_export', 'asset_export', { format: 'zip', selectedAssetCount: selectedAssets.length })) return;
    if (selectedAssets.length === 0) return;
    setIsDownloading(true);

    try {
      const zip = new JSZip();

      const selectedAssetRecords = selectedAssets
        .map(id => assets.find(a => a.id === id))
        .filter((asset): asset is WorkspaceAsset => Boolean(asset));
      if (!(await preflightAssetExport('zip', selectedAssetRecords))) return;

      const manifest = selectedAssetRecords.map((asset) => ({
        id: asset.id,
        name: asset.name,
        type: asset.type,
        size: asset.size,
        source: asset.source,
        moduleId: asset.moduleId,
        tags: asset.tags,
        createdAt: new Date(asset.createdAt).toISOString(),
        updatedAt: new Date(asset.updatedAt).toISOString(),
        downloadUrl: asset.url ?? asset.previewUrl ?? null,
        generationJobId: asset.generationJobId ?? null,
      }));

      zip.file('asset_manifest.json', JSON.stringify({
        workspaceId: session.workspace.id,
        exportedAt: new Date().toISOString(),
        assetCount: manifest.length,
        assets: manifest,
      }, null, 2));

      selectedAssetRecords.forEach(asset => {
        const assetFolder = zip.folder(`assets/${asset.id}`);
        if (!assetFolder) return;
        const downloadUrl = asset.url ?? asset.previewUrl ?? null;
        assetFolder.file('metadata.json', JSON.stringify({
          id: asset.id,
          name: asset.name,
          type: asset.type,
          size: asset.size,
          source: asset.source,
          moduleId: asset.moduleId,
          tags: asset.tags,
          downloadUrl,
          previewUrl: asset.previewUrl ?? null,
          generationJobId: asset.generationJobId ?? null,
          metadata: asset.metadata,
          createdAt: new Date(asset.createdAt).toISOString(),
          updatedAt: new Date(asset.updatedAt).toISOString(),
          lastAccessedAt: asset.lastAccessedAt ? new Date(asset.lastAccessedAt).toISOString() : null,
        }, null, 2));
        if (downloadUrl) {
          assetFolder.file('downloadUrl.txt', downloadUrl);
        }
      });

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'assets_download.zip');
      logAssetAudit('asset_export', {
        format: 'zip',
        assetCount: selectedAssetRecords.length,
        assetIds: selectedAssetRecords.map(asset => asset.id),
        manifest: true,
      }, selectedAssetRecords.length === 1 ? selectedAssetRecords[0]?.id : undefined);
      recordAssetExportUsage('zip', selectedAssetRecords);
    } catch (e) {
      console.error('ZIP creation failed', e);
    } finally {
      setIsDownloading(false);
      setSelectedAssets([]);
    }
  };

  const handleCreateUploadPlaceholder = () => {
    if (!requireAssetManagement('asset_create', 'asset_upload_placeholder')) return;
    const asset = createWorkspaceAsset(
      {
        name: `Uploaded_Asset_${assets.length + 1}.png`,
        type: 'image',
        size: '0 KB',
        source: 'uploaded',
        moduleId: 'assets',
        tags: ['upload'],
      },
      assetContext,
    );
    logAssetAudit('asset_create', {
      name: asset.name,
      type: asset.type,
      size: asset.size,
      source: asset.source,
    }, asset.id);
    toast(`Created asset record: ${asset.name}`, 'success');
  };

  const handleDeleteSelected = () => {
    if (!requireAssetManagement('asset_delete', 'asset_delete', { selectedAssetCount: selectedAssets.length })) return;
    if (selectedAssets.length === 0) return;
    const assetIds = [...selectedAssets];
    deleteWorkspaceAssets(selectedAssets, assetContext);
    logAssetAudit('asset_delete', {
      assetCount: assetIds.length,
      assetIds,
    }, assetIds.length === 1 ? assetIds[0] : undefined);
    toast(`Deleted ${selectedAssets.length} assets`, 'success');
    setSelectedAssets([]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="icon-xl text-green-500" />;
      case 'video': return <Video className="icon-xl text-blue-500" />;
      case 'audio': return <Music className="icon-xl text-purple-500" />;
      case 'document': return <FileText className="icon-xl text-blue-500" />;
      default: return <FileText className="icon-xl text-[var(--text-muted)]" />;
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesFilter = activeFilter === 'all' || asset.type === activeFilter;
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[var(--bg-app)]">
      {/* Sidebar Filters */}
      <div className="w-[280px] bg-[var(--bg-panel)] border-r border-[var(--border-color)] shadow-sm flex flex-col flex-shrink-0 relative z-10 transition-all">
        <div className="p-5 border-b border-[var(--border-color)]">
          <button
            onClick={handleCreateUploadPlaceholder}
            disabled={!canManageAssets}
            title={canManageAssets ? undefined : '当前角色没有资产管理权限'}
            className="w-full flex items-center justify-center space-x-2 bg-[var(--color-primary)] hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white px-4 py-3 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm"
          >
            <Upload className="w-[18px] h-[18px]" />
            <span>上传素材或文件夹</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 py-6 space-y-8 custom-scrollbar">
          <div>
            <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-3 px-3">文件类型</h3>
            <ul className="space-y-1">
              {fileTypes.map((item) => (
                <li key={item.id}>
                  <button 
                    onClick={() => setActiveFilter(item.id)}
                    className={`w-full text-left px-4 py-2.5 rounded-[var(--radius-lg)] text-[15px] transition-colors ${activeFilter === item.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-50 font-medium'}`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-3 px-3">项目文件夹</h3>
            <ul className="space-y-1">
              {[
                { name: '2026 新品发布', count: 12 },
                { name: '社交媒体素材', count: 45 },
                { name: '官方网站重构', count: 8 },
                { name: '数字人模型库', count: 32 },
              ].map((folder, idx) => (
                <li key={idx}>
                  <button className="w-full flex items-center justify-between px-4 py-2.5 rounded-[var(--radius-lg)] text-[15px] text-gray-600 hover:bg-gray-50 font-medium transition-colors group">
                    <span className="flex items-center truncate pr-2">
                      <Folder className="w-[18px] h-[18px] mr-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
                      <span className="truncate">{folder.name}</span>
                    </span>
                    <span className="text-[13px] text-gray-400 font-bold bg-gray-100 rounded-lg px-2">{folder.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Storage Tracker Base */}
        <div className="p-5 bg-gray-50/80 border-t border-[var(--border-color)]">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="font-bold text-gray-700">主理人私有存储空间</span>
            <span className="text-[var(--text-muted)] font-medium">45GB / 100GB</span>
          </div>
          <div className="w-full bg-gray-200/80 rounded-full h-2 mb-4">
            <div className="bg-[var(--color-primary)] h-2 rounded-full" style={{ width: '45%' }}></div>
          </div>
          <div className="flex flex-col gap-2">
            <button className="w-full py-2 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">扩容空间</button>
            <button
              onClick={() => {
                if (!requireAssetManagement()) return;
                setIsCleanupOpen(true);
              }}
              disabled={!canManageAssets}
              title={canManageAssets ? undefined : '当前角色没有资产管理权限'}
              className="w-full py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-bold shadow-sm hover:bg-amber-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="icon-sm" />
              <span>清理临时文件</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-app)]">
        <div className="px-8 flex-shrink-0 pt-6 pb-2">
          <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight flex items-center">
            数字资产保险库
            <span className="ml-3 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded shadow-sm border border-blue-200 uppercase tracking-widest flex items-center">
              Global Asset Node
            </span>
          </h2>
          <p className="text-[14px] text-[var(--text-muted)] mt-2 font-medium">统一存储与分发全模态数字资产，为 Agent 集群提供强大的跨流转数据支点。</p>
        </div>
        <div className="px-8 flex-shrink-0 py-4 border-b border-[var(--border-color)] flex items-center justify-between bg-transparent z-0 relative">
           <div className="flex items-center space-x-4">
             <div className="relative">
               <Search className="icon-sm absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
               <input 
                 type="text" 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 placeholder="搜索我的文件..." 
                 className="pl-9 pr-4 py-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-72 bg-[#F1F3F4] focus:bg-[var(--bg-panel)] transition-all outline-none"
               />
             </div>
             <button className="p-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] text-[var(--text-muted)] hover:bg-gray-50 transition-colors shadow-sm bg-[var(--bg-panel)]">
               <Filter className="icon-sm" />
             </button>
           </div>
           
           <div className="flex items-center bg-gray-100 p-1 rounded-[var(--radius-lg)] shadow-inner border border-[var(--border-color)]/60">
             <button className="p-1.5 bg-[var(--bg-panel)] shadow-sm text-[var(--text-main)] rounded-lg"><Grid className="w-[18px] h-[18px]" /></button>
             <button className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg transition-colors"><List className="w-[18px] h-[18px]" /></button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-[var(--spacing-lg)]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[var(--text-main)]">{searchQuery ? '搜索结果' : '素材列表'}</h3>
            {selectedAssets.length > 0 && (
              <div className="flex items-center gap-3">
                {selectedAssets.length >= 2 && (
                  <button
                    onClick={() => setIsPreviewOpen(true)}
                    className="flex items-center space-x-2 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-[var(--text-main)] px-4 py-2 rounded-[var(--radius-lg)] text-sm font-bold shadow-sm transition-colors animate-in fade-in zoom-in duration-200"
                  >
                    <Maximize2 className="icon-sm" />
                    <span>对比预览</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    if (!requireAssetManagement()) return;
                    toast(`Added labels to ${selectedAssets.length} assets`, 'success');
                  }}
                  disabled={!canManageAssets}
                  className="flex items-center space-x-2 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed text-[var(--text-main)] px-4 py-2 rounded-[var(--radius-lg)] text-sm font-bold shadow-sm transition-colors animate-in fade-in zoom-in duration-200"
                >
                  <Tag className="icon-sm" />
                  <span>Label</span>
                </button>
                <button
                  onClick={() => {
                    if (!requireAssetManagement()) return;
                    toast(`Assigned ${selectedAssets.length} assets`, 'success');
                  }}
                  disabled={!canManageAssets}
                  className="flex items-center space-x-2 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed text-[var(--text-main)] px-4 py-2 rounded-[var(--radius-lg)] text-sm font-bold shadow-sm transition-colors animate-in fade-in zoom-in duration-200"
                >
                  <UserPlus className="icon-sm" />
                  <span>Assign</span>
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={!canManageAssets}
                  className="flex items-center space-x-2 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed text-red-600 px-4 py-2 rounded-[var(--radius-lg)] text-sm font-bold shadow-sm transition-colors animate-in fade-in zoom-in duration-200"
                >
                  <Trash2 className="icon-sm" />
                  <span>Delete</span>
                </button>
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                <button
                  onClick={handleExportCSV}
                  disabled={!canManageAssets}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-[var(--radius-lg)] text-sm font-bold shadow-sm transition-colors animate-in fade-in zoom-in duration-200"
                >
                  <FileOutput className="icon-sm" />
                  <span>导出元数据 CSV</span>
                </button>
                <button
                  onClick={handleBulkDownload}
                  disabled={isDownloading || !canManageAssets}
                  className="flex items-center space-x-2 bg-[var(--color-primary)] hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-[var(--radius-lg)] text-sm font-bold shadow-sm transition-colors animate-in fade-in zoom-in duration-200"
                >
                  <Download className="icon-sm" />
                  <span>{isDownloading ? '打包中...' : `下载已选 (${selectedAssets.length})`}</span>
                </button>
              </div>
            )}
          </div>
          {filteredAssets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-[var(--spacing-md)]">
              {filteredAssets.map((asset) => (
                <div key={asset.id} 
                     draggable
                     onDragStart={(e) => handleAssetDragStart(e, asset)}
                     onClick={(e) => toggleSelection(asset.id, e)}
                     className={`bg-[var(--bg-panel)] rounded-[20px] border ${selectedAssets.includes(asset.id) ? 'border-blue-500 ring-4 ring-blue-50' : 'border-[var(--border-color)]'} overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group flex flex-col cursor-pointer relative animate-in fade-in zoom-in-95 duration-200`}>
                  
                  <div className={`absolute top-3 left-3 icon-md rounded-md border flex items-center justify-center z-20 transition-all ${selectedAssets.includes(asset.id) ? 'bg-[var(--color-primary)] border-blue-600 shadow-sm scale-110' : 'bg-[var(--bg-panel)]/90 border-gray-300 opacity-0 group-hover:opacity-100 drop-shadow-sm'}`}>
                    {selectedAssets.includes(asset.id) && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </div>

                  <div className="aspect-square bg-gray-50/80 flex items-center justify-center border-b border-[var(--border-color)] relative group-hover:bg-gray-100/80 transition-colors">
                     {getIcon(asset.type)}
                     <div className="absolute inset-0 bg-transparent group-hover:bg-black/5 transition-colors"></div>
                     <button className="absolute top-2 right-2 p-1.5 bg-[var(--bg-panel)]/80 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 shadow-sm border border-black/5 text-gray-600 hover:text-[var(--color-primary)] transition-all">
                        <MoreVertical className="icon-sm" />
                     </button>
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h4 className="text-[14px] font-bold text-[var(--text-main)] truncate pr-2 group-hover:text-[var(--color-primary)] transition-colors leading-tight mb-2" title={asset.name}>{asset.name}</h4>
                    <div className="mt-auto flex items-center justify-between text-[12px] text-[var(--text-muted)] font-medium">
                      <span className="bg-gray-100 px-2 py-0.5 rounded-md">{asset.size}</span>
                      <span>{formatAssetDate(asset)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] animate-in fade-in duration-300">
              <Folder className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-lg font-bold text-[var(--text-main)]">没有找到匹配的文件</p>
              <p className="text-sm mt-1">尝试更改搜索词或过滤器</p>
            </div>
          )}
        </div>
      </div>

      {/* Compare Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-[var(--spacing-xl)]">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsPreviewOpen(false)} />
          <div className="relative w-full max-w-7xl h-full max-h-[90vh] bg-[#F1F3F4] rounded-[24px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 bg-[var(--bg-panel)] border-b border-[var(--border-color)]">
              <h3 className="font-bold text-[var(--text-main)] flex items-center">
                <Maximize2 className="icon-md mr-2 text-[var(--color-primary)]" /> 
                快速对比预览 <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{selectedAssets.length} 项选择</span>
              </h3>
              <button onClick={() => setIsPreviewOpen(false)} className="p-2 text-[var(--text-muted)] hover:bg-gray-100 rounded-[var(--radius-lg)] transition-colors">
                <X className="icon-md" />
              </button>
            </div>
            <div className="flex-1 p-[var(--spacing-lg)] overflow-hidden">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--spacing-md)] h-full overflow-y-auto no-scrollbar pb-6">
                  {selectedAssets.map(id => {
                     const asset = assets.find(a => a.id === id);
                     if (!asset) return null;
                     return (
                       <div key={asset.id} className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] overflow-hidden flex flex-col shadow-sm group">
                         <div className="aspect-video bg-gray-50 flex flex-col items-center justify-center border-b border-[var(--border-color)] relative">
                            {getIcon(asset.type)}
                            {asset.type === 'image' && <span className="mt-3 text-xs text-gray-400">Image Asset</span>}
                            {asset.type === 'video' && <span className="mt-3 text-xs text-gray-400">Video Asset</span>}
                         </div>
                         <div className="p-4 bg-[var(--bg-panel)]">
                           <h4 className="font-bold text-[var(--text-main)] text-sm truncate" title={asset.name}>{asset.name}</h4>
                           <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                             <div className="bg-gray-50 rounded p-2 text-center border border-[var(--border-color)]">
                               <span className="block text-gray-400 mb-0.5 scale-90">大小</span>
                               <span className="font-bold text-gray-700">{asset.size}</span>
                             </div>
                             <div className="bg-gray-50 rounded p-2 text-center border border-[var(--border-color)]">
                               <span className="block text-gray-400 mb-0.5 scale-90">修改日期</span>
                               <span className="font-bold text-gray-700">{formatAssetDate(asset)}</span>
                             </div>
                           </div>
                         </div>
                       </div>
                     );
                  })}
               </div>
            </div>
            <div className="p-4 bg-[var(--bg-panel)] border-t border-[var(--border-color)] flex justify-end">
              <button 
                onClick={() => setIsPreviewOpen(false)}
                className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-blue-700 text-white rounded-[var(--radius-lg)] font-bold shadow-sm transition-colors text-sm"
              >
                结束对比
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cleanup Modal */}
      {isCleanupOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isCleaning && setIsCleanupOpen(false)} />
          <div className="relative w-full max-w-md bg-[var(--bg-panel)] rounded-[var(--radius-xl)] shadow-2xl p-[var(--spacing-lg)] animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-4">
               <AlertTriangle className="icon-lg text-amber-500" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">清理临时文件 & 缓存</h3>
            <p className="text-sm text-[var(--text-muted)] mb-[var(--spacing-md)]">我们发现有 <strong>14 个陈旧的临时文件</strong>（例如失败的图片生成草稿、废弃的掩码区域、过期的预览压缩包），总共占用 <strong>824 MB</strong>。系统可自动清理它们释放空间。</p>
            
            <div className="flex gap-3 justify-end">
               <button 
                 onClick={() => setIsCleanupOpen(false)} 
                 disabled={isCleaning}
                 className="px-5 py-2 hover:bg-gray-50 text-gray-700 rounded-[var(--radius-lg)] font-bold text-sm transition-colors"
               >
                 取消
               </button>
               <button 
                 onClick={() => {
                   if (!requireAssetManagement()) return;
                   setIsCleaning(true);
                   setTimeout(() => {
                     setIsCleaning(false);
                     setIsCleanupOpen(false);
                     toast('已成功释放 824 MB 临时缓存空间！', 'success');
                   }, 2000);
                 }} 
                 disabled={isCleaning}
                 className="px-5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-[var(--radius-lg)] font-bold text-sm shadow-sm transition-colors flex items-center gap-2"
               >
                 {isCleaning ? (
                   <>
                     <div className="icon-sm border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                     <span>正在清理...</span>
                   </>
                 ) : (
                   <>
                     <Trash2 className="icon-sm" />
                     <span>确认清理 (824 MB)</span>
                   </>
                 )}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
